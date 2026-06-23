import { createSupabaseServiceClient } from '@/lib/supabase/server';

type SendMessagePayload = {
  companyId?: string;
  conversationId?: string;
  contactId?: string | null;
  toPhone?: string;
  text?: string;
};

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

async function sendToWhatsAppCloud(toPhone: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';

  if (!accessToken || !phoneNumberId) {
    return { sent: false, providerMessageId: null, status: 'queued' };
  }

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: {
        preview_url: false,
        body: text
      }
    })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    console.error('Falha ao enviar mensagem WhatsApp.', data);
    return { sent: false, providerMessageId: null, status: 'failed' };
  }

  return {
    sent: true,
    providerMessageId: data?.messages?.[0]?.id || null,
    status: 'sent'
  };
}

export async function POST(request: Request) {
  let payload: SendMessagePayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const companyId = payload.companyId;
  const conversationId = payload.conversationId;
  const contactId = payload.contactId || null;
  const toPhone = normalizePhone(payload.toPhone);
  const text = payload.text?.trim();

  if (!companyId || !conversationId || !toPhone || !text) {
    return Response.json({ ok: false, error: 'Empresa, conversa, telefone e mensagem são obrigatórios.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return Response.json({ ok: false, error: 'Supabase service role não configurado.' }, { status: 500 });
  }

  const sendResult = await sendToWhatsAppCloud(toPhone, text);
  const now = new Date().toISOString();

  const { data: savedMessage, error: messageError } = await supabase
    .from('whatsapp_messages')
    .insert({
      company_id: companyId,
      conversation_id: conversationId,
      contact_id: contactId,
      direction: 'outbound',
      provider_message_id: sendResult.providerMessageId,
      from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      to_phone: toPhone,
      message_type: 'text',
      body: text,
      status: sendResult.status,
      raw_payload: { source: 'crm', sent: sendResult.sent },
      created_at: now
    })
    .select('*')
    .single();

  if (messageError) {
    console.error('Falha ao salvar mensagem enviada.', messageError);
    return Response.json({ ok: false, error: 'Mensagem enviada/processada, mas não foi salva.' }, { status: 500 });
  }

  await supabase
    .from('whatsapp_conversations')
    .update({
      last_message_at: now,
      updated_at: now
    })
    .eq('id', conversationId);

  if (contactId) {
    await supabase
      .from('activity_logs')
      .insert({
        company_id: companyId,
        contact_id: contactId,
        type: 'whatsapp_outbound',
        description: `WhatsApp enviado: ${text}`
      });
  }

  return Response.json({ ok: true, sent: sendResult.sent, message: savedMessage });
}
