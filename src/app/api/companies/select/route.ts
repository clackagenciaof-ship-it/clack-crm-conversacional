import { assertClackAdmin, getAdminRequestContext } from '@/lib/server/clack-admin';

type SelectCompanyPayload = {
  companyId?: string;
};

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!assertClackAdmin(context)) {
    return Response.json({ ok: false, error: 'Apenas a equipe ADM Clack pode alternar empresa ativa.' }, { status: 403 });
  }

  let payload: SelectCompanyPayload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.companyId) {
    return Response.json({ ok: false, error: 'Empresa é obrigatória.' }, { status: 400 });
  }

  const { data: company, error: companyError } = await context.service
    .from('companies')
    .select('id, name, email, phone, city, state, segment, status, plan_name, user_limit, billing_status, created_at')
    .eq('id', payload.companyId)
    .single();

  if (companyError || !company) {
    return Response.json({ ok: false, error: 'Empresa não encontrada.' }, { status: 404 });
  }

  const { data: profile, error: profileError } = await context.service
    .from('profiles')
    .update({ company_id: payload.companyId })
    .eq('id', context.profile.id)
    .select('id, company_id, name, email, role, status')
    .single();

  if (profileError) {
    console.error('Falha ao selecionar empresa ativa.', profileError);
    return Response.json({ ok: false, error: 'Não foi possível selecionar a empresa ativa.' }, { status: 500 });
  }

  return Response.json({ ok: true, company, profile });
}
