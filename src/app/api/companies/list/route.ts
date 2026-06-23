import { assertClackAdmin, getAdminRequestContext } from '@/lib/server/clack-admin';

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!assertClackAdmin(context)) {
    return Response.json({ ok: false, error: 'Apenas a equipe ADM Clack pode listar empresas.' }, { status: 403 });
  }

  const { data, error: listError } = await context.service
    .from('companies')
    .select('id, name, document, email, phone, city, state, segment, status, plan_name, user_limit, billing_status, created_at')
    .order('created_at', { ascending: false });

  if (listError) {
    console.error('Falha ao listar empresas.', listError);
    return Response.json({ ok: false, error: 'Não foi possível listar empresas.' }, { status: 500 });
  }

  return Response.json({ ok: true, companies: data || [], activeCompanyId: context.profile.company_id });
}
