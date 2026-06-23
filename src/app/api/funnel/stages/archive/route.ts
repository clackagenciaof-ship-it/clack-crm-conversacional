import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

function canManageFunnel(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageFunnel(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar funil.' }, { status: 403 });

  let payload: { stageId?: string };
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.stageId) return Response.json({ ok: false, error: 'Etapa é obrigatória.' }, { status: 400 });

  const { data: stage, error: updateError } = await context.service
    .from('pipeline_stages')
    .update({ active: false, status: 'archived' })
    .eq('id', payload.stageId)
    .eq('company_id', context.profile.company_id)
    .select('*')
    .single();

  if (updateError) {
    console.error('Falha ao arquivar etapa.', updateError);
    return Response.json({ ok: false, error: updateError.message || 'Não foi possível arquivar a etapa.' }, { status: 500 });
  }

  await context.service.from('pipeline_stage_audit_logs').insert({
    company_id: context.profile.company_id,
    actor_profile_id: context.profile.id,
    stage_id: stage.id,
    action: 'stage_archived',
    next_value: stage
  });

  return Response.json({ ok: true, stage });
}
