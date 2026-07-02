import { createHmac, timingSafeEqual } from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { processWhatsAppWebhookPayload } from '@/lib/whatsapp/webhook-processor';

function isValidSignature(rawBody: string, signatureHeader: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true;
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
  const received = signatureHeader;
  return expected.length === received.length && timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const health = searchParams.get('health');

  if (health === '1') {
    console.info('CLACK_WHATSAPP_WEBHOOK_HEALTH', { ok: true, hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN), hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) });
    return Response.json({ ok: true, route: '/api/whatsapp/webhook', verifyTokenConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN), serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) });
  }

  console.info('CLACK_WHATSAPP_WEBHOOK_VERIFY', { mode, tokenMatches: token === process.env.WHATSAPP_VERIFY_TOKEN, hasChallenge: Boolean(challenge) });

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  console.info('CLACK_WHATSAPP_WEBHOOK_POST_RECEIVED', { bytes: rawBody.length, hasSignature: Boolean(request.headers.get('x-hub-signature-256')) });

  if (!isValidSignature(rawBody, request.headers.get('x-hub-signature-256'))) {
    console.error('CLACK_WHATSAPP_WEBHOOK_INVALID_SIGNATURE');
    return Response.json({ ok: false, error: 'Assinatura inválida.' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    console.error('CLACK_WHATSAPP_WEBHOOK_INVALID_JSON');
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    console.error('CLACK_WHATSAPP_WEBHOOK_NO_SUPABASE_SERVICE_CLIENT');
    return Response.json({ ok: true, stored: false, processed: false });
  }

  const { data: eventRow, error: eventError } = await supabase.from('whatsapp_webhook_events').insert({ event_type: 'whatsapp_webhook', payload, processed: false }).select('*').single();
  if (eventError) console.error('Falha ao registrar webhook do WhatsApp.', eventError);

  try {
    const result = await processWhatsAppWebhookPayload(supabase, payload);
    if (eventRow?.id) {
      await supabase.from('whatsapp_webhook_events').update({ company_id: result.companyId, processed: result.processedMessages > 0 || result.processedStatuses > 0 }).eq('id', eventRow.id);
    }
    console.info('CLACK_WHATSAPP_WEBHOOK_PROCESSED', { stored: Boolean(eventRow?.id), processedMessages: result.processedMessages, processedStatuses: result.processedStatuses, companyId: result.companyId });
    return Response.json({ ok: true, stored: Boolean(eventRow?.id), processedMessages: result.processedMessages, processedStatuses: result.processedStatuses });
  } catch (error) {
    console.error('Falha ao processar webhook do WhatsApp.', error);
    return Response.json({ ok: true, stored: Boolean(eventRow?.id), processed: false });
  }
}
