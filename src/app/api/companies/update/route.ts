import { assertClackAdmin, getAdminRequestContext, planLimitFromName } from '@/lib/server/clack-admin';

type CompanyPayload = {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  segment?: string;
  status?: string;
  plan_name?: string;
  user_limit?: number;
  billing_status?: string;
};

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!assertClackAdmin(context)) {
    return Response.json({ ok: false, error: 'Apenas a equipe ADM Clack pode atualizar empresas.' }, { status: 403 });
  }

  let payload: CompanyPayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.id) {
    return Response.json({ ok: false, error: 'Empresa é obrigatória.' }, { status: 400 });
  }

  const planName = payload.plan_name || 'Inicial';
  const userLimit = planLimitFromName(planName, Number(payload.user_limit || 0));

  const { data: company, error: updateError } = await context.service
    .from('companies')
    .update({
      name: payload.name?.trim() || 'Empresa sem nome',
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      city: payload.city?.trim() || null,
      state: payload.state?.trim() || null,
      segment: payload.segment?.trim() || null,
      status: payload.status || 'active',
      plan_name: planName,
      user_limit: userLimit,
      billing_status: payload.billing_status || 'active'
    })
    .eq('id', payload.id)
    .select('id, name, email, phone, city, state, segment, status, plan_name, user_limit, billing_status, created_at')
    .single();

  if (updateError) {
    console.error('Falha ao atualizar empresa.', updateError);
    return Response.json({ ok: false, error: 'Não foi possível atualizar a empresa.' }, { status: 500 });
  }

  await context.service.from('company_plan_audit_logs').insert({
    company_id: company.id,
    actor_profile_id: context.profile.id,
    action: 'company_plan_updated',
    next_value: company
  });

  return Response.json({ ok: true, company });
}
