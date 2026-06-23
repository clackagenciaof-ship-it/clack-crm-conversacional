import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type SendMessagePayload = {
  conversationId?: string;
  contactId?: string | null;
  toPhone?: string;
  text?: string;
};

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

function canSendMessage(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Atendente' || normalized === 'Vendedor';
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
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!context.profile.company_id) {
    return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  }

  if (!canSendMessage(context.profile.role)) {
    return Response.json({ ok: false, error: 'Perfil sem permissão para enviar mensagens.' }, { status: 403 });
  }

  let payload: SendMessagePayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const companyId = context.profile.company_id;
  const conversationId = payload.conversationId;
  const contactId = payload.contactId || null;
  const toPhone = normalizePhone(payload.toPhone);
  const text = payload.text?.trim();

  if (!conversationId || !toPhone || !text) {
    return Response.json({ ok: false, error: 'Conversa, telefone e mensagem são obrigatórios.' }, { status: 400 });
  }

  const { data: conversation, error: conversationError } = await context.service
    .from('whatsapp_conversations')
    .select('id, company_id, contact_id')
    .eq('company_id', companyId)
    .eq('id', conversationId)
    .single();

  if (conversationError || !conversation) {
    return Response.json({ ok: false, error: 'Conversa não encontrada para esta empresa.' }, { status: 404 });
  }

  const sendResult = await sendToWhatsAppCloud(toPhone, text);
  const now = new Date().toISOString();

  const { data: savedMessage, error: messageError } = await context.service
    .from('whatsapp_messages')
    .insert({
      company_id: companyId,
      conversation_id: conversationId,
      contact_id: contactId || conversation.contact_id || null,
      user_id: context.profile.id,
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

  await context.service
    .from('whatsapp_conversations')
    .update({
      last_message_at: now,
      status: 'Em atendimento',
      assigned_to: context.profile.id,
      updated_at: now
    })
    .eq('company_id', companyId)
    .eq('id', conversationId);

  if (contactId || conversation.contact_id) {
    await context.service
      .from('activity_logs')
      .insert({
        company_id: companyId,
        contact_id: contactId || conversation.contact_id,
        user_id: context.profile.id,
        type: 'whatsapp_outbound',
        description: `WhatsApp enviado: ${text}`
      });
  }

  await context.service.from('atendimento_audit_logs').insert({
    company_id: companyId,
    conversation_id: conversationId,
    actor_profile_id: context.profile.id,
    action: 'message_sent',
    next_value: { text, status: sendResult.status, sent: sendResult.sent }
  });

  return Response.json({ ok: true, sent: sendResult.sent, message: savedMessage });
}
