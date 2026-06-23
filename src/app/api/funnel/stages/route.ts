import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type StagePayload = {
  id?: string;
  name?: string;
  position?: number;
  probability?: number;
  color?: string | null;
};

function canManageFunnel(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

async function getOrCreateDefaultPipeline(service: any, companyId: string) {
  const { data: existing, error: findError } = await service
    .from('pipelines')
    .select('id, is_default, name')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })
    .order('name', { ascending: true })
    .limit(1);

  if (findError) throw findError;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data: created, error: createError } = await service
    .from('pipelines')
    .insert({ company_id: companyId, name: 'Funil comercial', is_default: true, status: 'active' })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id as string;
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const { data, error: listError } = await context.service
    .from('pipeline_stages')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .order('position', { ascending: true });

  if (listError) {
    console.error('Falha ao carregar etapas do funil.', listError);
    return Response.json({ ok: false, error: listError.message || 'Não foi possível carregar etapas do funil.' }, { status: 500 });
  }

  const stages = (data || []).filter((stage: any) => stage.active !== false && stage.status !== 'archived');
  const archivedStages = (data || []).filter((stage: any) => stage.active === false || stage.status === 'archived');
  return Response.json({ ok: true, stages, archivedStages });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageFunnel(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar funil.' }, { status: 403 });

  let payload: StagePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.name?.trim()) return Response.json({ ok: false, error: 'Nome da etapa é obrigatório.' }, { status: 400 });

  try {
    const pipelineId = await getOrCreateDefaultPipeline(context.service, context.profile.company_id);
    const stagePayload = {
      company_id: context.profile.company_id,
      pipeline_id: pipelineId,
      name: payload.name.trim(),
      position: Number(payload.position || 1),
      color: payload.color || null,
      probability: Math.max(0, Math.min(100, Number(payload.probability ?? 20))),
      active: true,
      status: 'active'
    };

    const query = payload.id
      ? context.service.from('pipeline_stages').update(stagePayload).eq('id', payload.id).eq('company_id', context.profile.company_id).select('*').single()
      : context.service.from('pipeline_stages').insert(stagePayload).select('*').single();

    const { data: stage, error: stageError } = await query;
    if (stageError) throw stageError;

    await context.service.from('pipeline_stage_audit_logs').insert({
      company_id: context.profile.company_id,
      actor_profile_id: context.profile.id,
      stage_id: stage.id,
      action: payload.id ? 'stage_updated' : 'stage_created',
      next_value: stage
    });

    return Response.json({ ok: true, stage });
  } catch (saveError: any) {
    console.error('Falha ao salvar etapa do funil.', saveError);
    return Response.json({ ok: false, error: saveError?.message || 'Não foi possível salvar a etapa do funil.' }, { status: 500 });
  }
}