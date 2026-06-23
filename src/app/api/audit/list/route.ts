import { getAdminRequestContext } from '@/lib/server/clack-admin';

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!context.profile.company_id) {
    return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  }

  const { data, error: listError } = await context.service
    .from('company_plan_audit_logs')
    .select('id, company_id, actor_profile_id, action, previous_value, next_value, created_at')
    .eq('company_id', context.profile.company_id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (listError) {
    console.error('Falha ao listar auditoria.', listError);
    return Response.json({ ok: false, error: 'Não foi possível carregar a auditoria.' }, { status: 500 });
  }

  return Response.json({ ok: true, logs: data || [] });
}
