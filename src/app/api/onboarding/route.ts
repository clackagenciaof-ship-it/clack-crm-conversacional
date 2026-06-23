import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type OnboardingPayload = {
  checklist?: Record<string, boolean>;
  current_step?: string;
  status?: string;
  notes?: string;
};

function canManageOnboarding(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

const defaultChecklist = {
  empresa: false,
  usuarios: false,
  produtos: false,
  funil: false,
  mensagens: false,
  atendimento: false,
  financeiro: false,
  automacoes: false,
  whatsapp: false,
  treinamento: false
};

function score(checklist: Record<string, boolean>) {
  const values = Object.values(checklist);
  if (!values.length) return 0;
  return Math.round((values.filter(Boolean).length / values.length) * 100);
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageOnboarding(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para onboarding.' }, { status: 403 });

  const companyId = context.profile.company_id;
  let { data: onboarding, error: onboardingError } = await context.service.from('company_onboarding').select('*').eq('company_id', companyId).maybeSingle();
  if (onboardingError) return Response.json({ ok: false, error: onboardingError.message }, { status: 500 });

  if (!onboarding) {
    const { data: created, error: createError } = await context.service.from('company_onboarding').insert({ company_id: companyId, created_by: context.profile.id, checklist: defaultChecklist }).select('*').single();
    if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
    onboarding = created;
  }

  const [{ data: company }, { data: profiles }, { data: products }, { data: stages }, { data: flows }, { data: events }] = await Promise.all([
    context.service.from('companies').select('*').eq('id', companyId).maybeSingle(),
    context.service.from('profiles').select('id, name, email, role, status').eq('company_id', companyId),
    context.service.from('product_services').select('id, status').eq('company_id', companyId),
    context.service.from('pipeline_stages').select('id').eq('company_id', companyId),
    context.service.from('chatbot_flows').select('id, active').eq('company_id', companyId),
    context.service.from('onboarding_events').select('*').eq('company_id', companyId).order('created_at', { ascending: false }).limit(20)
  ]);

  const diagnostics = {
    active_users: (profiles || []).filter((p: any) => p.status === 'active').length,
    products: (products || []).length,
    active_products: (products || []).filter((p: any) => p.status === 'Ativo').length,
    pipeline_stages: (stages || []).length,
    active_flows: (flows || []).filter((f: any) => f.active).length
  };

  return Response.json({ ok: true, onboarding, company, profiles: profiles || [], diagnostics, events: events || [] });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageOnboarding(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para onboarding.' }, { status: 403 });

  let payload: OnboardingPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  const companyId = context.profile.company_id;
  const checklist = { ...defaultChecklist, ...(payload.checklist || {}) };
  const launchScore = score(checklist);
  const status = payload.status || (launchScore >= 100 ? 'Concluído' : launchScore >= 70 ? 'Pronto para apresentação' : 'Em implantação');
  const completedAt = launchScore >= 100 ? new Date().toISOString() : null;

  const { data: current } = await context.service.from('company_onboarding').select('id').eq('company_id', companyId).maybeSingle();
  const updatePayload = {
    company_id: companyId,
    checklist,
    launch_score: launchScore,
    current_step: payload.current_step || 'Implantação guiada',
    status,
    notes: payload.notes || null,
    completed_at: completedAt,
    updated_at: new Date().toISOString(),
    created_by: context.profile.id
  };

  let onboarding;
  if (current?.id) {
    const { data, error: updateError } = await context.service.from('company_onboarding').update(updatePayload).eq('company_id', companyId).select('*').single();
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
    onboarding = data;
  } else {
    const { data, error: createError } = await context.service.from('company_onboarding').insert(updatePayload).select('*').single();
    if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
    onboarding = data;
  }

  await context.service.from('onboarding_events').insert({
    company_id: companyId,
    onboarding_id: onboarding.id,
    actor_profile_id: context.profile.id,
    action: 'onboarding_updated',
    details: { launchScore, status, currentStep: updatePayload.current_step }
  });

  return Response.json({ ok: true, onboarding });
}
