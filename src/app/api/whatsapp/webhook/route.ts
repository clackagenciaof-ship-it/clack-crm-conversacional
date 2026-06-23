import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { processWhatsAppWebhookPayload } from '@/lib/whatsapp/webhook-processor';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  if (!supabase) {
    return Response.json({ ok: true, stored: false, processed: false });
  }

  const { data: eventRow, error: eventError } = await supabase
    .from('whatsapp_webhook_events')
    .insert({
      event_type: 'whatsapp_webhook',
      payload,
      processed: false
    })
    .select('*')
    .single();

  if (eventError) {
    console.error('Falha ao registrar webhook do WhatsApp.', eventError);
  }

  try {
    const result = await processWhatsAppWebhookPayload(supabase, payload);

    if (eventRow?.id) {
      await supabase
        .from('whatsapp_webhook_events')
        .update({
          company_id: result.companyId,
          processed: result.processedMessages > 0
        })
        .eq('id', eventRow.id);
    }

    return Response.json({ ok: true, stored: Boolean(eventRow?.id), processed: result.processedMessages });
  } catch (error) {
    console.error('Falha ao processar webhook do WhatsApp.', error);
    return Response.json({ ok: true, stored: Boolean(eventRow?.id), processed: false });
  }
}
