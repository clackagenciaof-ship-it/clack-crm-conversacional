import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type BrandingPayload = {
  app_name?: string;
  brand_name?: string;
  logo_url?: string;
  favicon_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  sidebar_color?: string;
  welcome_title?: string;
  welcome_subtitle?: string;
  custom_domain?: string;
  white_label_enabled?: boolean;
  status?: string;
};

function canManageBranding(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

const fallbackBranding = {
  app_name: 'CLACK CRM',
  brand_name: 'CLACK CRM Conversacional',
  logo_url: null,
  favicon_url: null,
  primary_color: '#005954',
  secondary_color: '#338b85',
  accent_color: '#5dc1b9',
  background_color: '#f4fffe',
  sidebar_color: '#005954',
  welcome_title: 'Venda mais, atenda melhor e acompanhe seu funil em tempo real.',
  welcome_subtitle: 'Seu CRM inteligente de vendas e atendimento.',
  custom_domain: null,
  white_label_enabled: true,
  status: 'Ativo'
};

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const companyId = context.profile.company_id;
  let { data: branding, error: brandingError } = await context.service.from('company_branding').select('*').eq('company_id', companyId).maybeSingle();
  if (brandingError) return Response.json({ ok: false, error: brandingError.message }, { status: 500 });

  if (!branding) {
    const { data: created, error: createError } = await context.service.from('company_branding').insert({ company_id: companyId, created_by: context.profile.id, ...fallbackBranding }).select('*').single();
    if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
    branding = created;
  }

  return Response.json({ ok: true, branding, canManage: canManageBranding(context.profile.role) });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageBranding(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para alterar white label.' }, { status: 403 });

  let payload: BrandingPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  const companyId = context.profile.company_id;
  const clean = {
    app_name: payload.app_name?.trim() || fallbackBranding.app_name,
    brand_name: payload.brand_name?.trim() || fallbackBranding.brand_name,
    logo_url: payload.logo_url?.trim() || null,
    favicon_url: payload.favicon_url?.trim() || null,
    primary_color: payload.primary_color || fallbackBranding.primary_color,
    secondary_color: payload.secondary_color || fallbackBranding.secondary_color,
    accent_color: payload.accent_color || fallbackBranding.accent_color,
    background_color: payload.background_color || fallbackBranding.background_color,
    sidebar_color: payload.sidebar_color || fallbackBranding.sidebar_color,
    welcome_title: payload.welcome_title?.trim() || fallbackBranding.welcome_title,
    welcome_subtitle: payload.welcome_subtitle?.trim() || fallbackBranding.welcome_subtitle,
    custom_domain: payload.custom_domain?.trim() || null,
    white_label_enabled: payload.white_label_enabled ?? true,
    status: payload.status || 'Ativo',
    updated_at: new Date().toISOString()
  };

  const { data: current } = await context.service.from('company_branding').select('id').eq('company_id', companyId).maybeSingle();
  if (current?.id) {
    const { data, error: updateError } = await context.service.from('company_branding').update(clean).eq('company_id', companyId).select('*').single();
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
    return Response.json({ ok: true, branding: data });
  }

  const { data, error: createError } = await context.service.from('company_branding').insert({ ...clean, company_id: companyId, created_by: context.profile.id }).select('*').single();
  if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
  return Response.json({ ok: true, branding: data });
}
