import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type CampaignPayload = { name?: string; segment_type?: string; message?: string; template_id?: string | null; };

function canManageCampaigns(role: string) { const normalized = normalizeRole(role); return normalized === 'Admin Empresa' || normalized === 'Gestor'; }
function normalizePhone(phone?: string | null) { return (phone || '').replace(/\D/g, ''); }

async function findRecipients(context: any, segmentType: string) {
  const companyId = context.profile.company_id;
  const selectColumns = 'id, name, phone, temperature, status, whatsapp_opt_in';

  if (segmentType === 'propostas_enviadas') {
    const { data: opportunities } = await context.service.from('opportunities').select('contact_id').eq('company_id', companyId).eq('stage_name', 'Proposta Enviada').eq('status', 'Aberta').limit(200);
    const ids = Array.from(new Set((opportunities || []).map((item: any) => item.contact_id).filter(Boolean)));
    if (!ids.length) return [];
    const { data: contacts } = await context.service.from('contacts').select(selectColumns).eq('company_id', companyId).in('id', ids).eq('whatsapp_opt_in', true);
    return contacts || [];
  }

  let query = context.service.from('contacts').select(selectColumns).eq('company_id', companyId).eq('whatsapp_opt_in', true).limit(200);
  if (segmentType === 'lead_quente') query = query.eq('temperature', 'Quente');
  if (segmentType === 'lead_morno') query = query.eq('temperature', 'Morno');
  if (segmentType === 'lead_frio') query = query.eq('temperature', 'Frio');
  if (segmentType === 'todos_leads') query = query.neq('status', 'Arquivado');
  const { data } = await query;
  return data || [];
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const { data: campaigns, error: campaignError } = await context.service.from('message_campaigns').select('*').eq('company_id', context.profile.company_id).order('created_at', { ascending: false }).limit(30);
  if (campaignError) return Response.json({ ok: false, error: campaignError.message }, { status: 500 });

  const { data: templates } = await context.service.from('whatsapp_templates').select('*').eq('company_id', context.profile.company_id).eq('active', true).order('created_at', { ascending: false });

  return Response.json({ ok: true, campaigns: campaigns || [], templates: templates || [] });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageCampaigns(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para criar disparos.' }, { status: 403 });

  let payload: CampaignPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }
  if (!payload.name?.trim()) return Response.json({ ok: false, error: 'Nome do disparo é obrigatório.' }, { status: 400 });
  if (!payload.message?.trim()) return Response.json({ ok: false, error: 'Mensagem do disparo é obrigatória.' }, { status: 400 });

  const segmentType = payload.segment_type || 'lead_quente';
  const recipients = await findRecipients(context, segmentType);
  const cleanRecipients = recipients.map((contact: any) => ({ ...contact, phone: normalizePhone(contact.phone) })).filter((contact: any) => contact.phone);

  const { data: campaign, error: campaignError } = await context.service.from('message_campaigns').insert({
    company_id: context.profile.company_id,
    name: payload.name.trim(),
    segment_type: segmentType,
    channel: 'WhatsApp',
    message: payload.message.trim(),
    template_id: payload.template_id || null,
    status: 'draft',
    total_recipients: cleanRecipients.length,
    queued_count: cleanRecipients.length,
    created_by: context.profile.id
  }).select('*').single();

  if (campaignError) return Response.json({ ok: false, error: campaignError.message }, { status: 500 });

  if (cleanRecipients.length) {
    const recipientPayload = cleanRecipients.map((contact: any) => ({ company_id: context.profile.company_id, campaign_id: campaign.id, contact_id: contact.id, phone: contact.phone, name: contact.name, status: 'queued' }));
    const { error: recipientsError } = await context.service.from('message_campaign_recipients').insert(recipientPayload);
    if (recipientsError) return Response.json({ ok: false, error: recipientsError.message }, { status: 500 });
  }

  await context.service.from('atendimento_audit_logs').insert({ company_id: context.profile.company_id, actor_profile_id: context.profile.id, action: 'campaign_created', next_value: { campaign: campaign.name, segmentType, recipients: cleanRecipients.length, optInOnly: true } });

  return Response.json({ ok: true, campaign: { ...campaign, total_recipients: cleanRecipients.length, queued_count: cleanRecipients.length } });
}
