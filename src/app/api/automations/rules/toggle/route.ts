import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

function canManageAutomations(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageAutomations(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar automações.' }, { status: 403 });

  let payload: { id?: string; active?: boolean };
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }
  if (!payload.id) return Response.json({ ok: false, error: 'Automação não informada.' }, { status: 400 });

  const { data: rule, error: updateError } = await context.service
    .from('automation_rules')
    .update({ active: Boolean(payload.active), updated_at: new Date().toISOString() })
    .eq('id', payload.id)
    .eq('company_id', context.profile.company_id)
    .select('*')
    .single();

  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
  return Response.json({ ok: true, rule });
}
