import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type TemplatePayload = {
  conversationId?: string;
  contactId?: string | null;
  toPhone?: string;
  templateName?: string;
  language?: string;
};

function normalizePhone(phone?: string | null) { return (phone || '').replace(/\D/g, ''); }
function canSend(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Atendente' || normalized === 'Vendedor';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canSend(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para enviar template.' }, { status: 403 });

  let payload: TemplatePayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  const toPhone = normalizePhone(payload.toPhone);
  const templateName = payload.templateName?.trim();
  const language = payload.language || 'pt_BR';
  if (!payload.conversationId || !toPhone || !templateName) return Response.json({ ok: false, error: 'Conversa, telefone e template são obrigatórios.' }, { status: 400 });

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
  let providerMessageId: string | null = null;
  let status = 'queued_template';
  let sent = false;
  let rawPayload: any = { source: 'crm_template', templateName, language };

  if (accessToken && phoneNumberId) {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toPhone, type: 'template', template: { name: templateName, language: { code: language } } })
    });
    const data = await response.json().catch(() => null);
    rawPayload = data || rawPayload;
    if (response.ok) { sent = true; status = 'sent'; providerMessageId = data?.messages?.[0]?.id || null; }
    else { status = 'failed'; }
  }

  const now = new Date().toISOString();
  const { data: savedMessage, error: messageError } = await context.service.from('whatsapp_messages').insert({
    company_id: context.profile.company_id,
    conversation_id: payload.conversationId,
    contact_id: payload.contactId || null,
    user_id: context.profile.id,
    direction: 'outbound',
    provider_message_id: providerMessageId,
    from_phone: phoneNumberId || null,
    to_phone: toPhone,
    message_type: 'template',
    body: `Template enviado: ${templateName}`,
    status,
    raw_payload: rawPayload,
    created_at: now
  }).select('*').single();

  if (messageError) return Response.json({ ok: false, error: 'Template processado, mas não foi salvo.' }, { status: 500 });

  await context.service.from('whatsapp_conversations').update({ status: 'Em atendimento', assigned_to: context.profile.id, last_message_at: now, updated_at: now }).eq('company_id', context.profile.company_id).eq('id', payload.conversationId);

  return Response.json({ ok: true, sent, message: savedMessage });
}
