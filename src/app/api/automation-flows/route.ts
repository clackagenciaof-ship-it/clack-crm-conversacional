import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type FlowPayload = {
  id?: string;
  name?: string;
  channel?: string;
  objective?: string;
  trigger_phrase?: string;
  status?: string;
  active?: boolean;
  steps?: Array<{ id?: string; position: number; step_type: string; message: string; delay_minutes?: number }>;
};

function canManageFlows(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const { data: flows, error: flowsError } = await context.service
    .from('chatbot_flows')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .order('created_at', { ascending: false });

  if (flowsError) return Response.json({ ok: false, error: flowsError.message }, { status: 500 });

  const flowIds = (flows || []).map((flow: any) => flow.id);
  const { data: steps } = flowIds.length
    ? await context.service.from('chatbot_flow_steps').select('*').in('flow_id', flowIds).order('position', { ascending: true })
    : { data: [] };

  return Response.json({ ok: true, flows: flows || [], steps: steps || [] });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageFlows(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar fluxos.' }, { status: 403 });

  let payload: FlowPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }
  if (!payload.name?.trim()) return Response.json({ ok: false, error: 'Nome do fluxo é obrigatório.' }, { status: 400 });

  const flowPayload = {
    company_id: context.profile.company_id,
    name: payload.name.trim(),
    channel: payload.channel || 'WhatsApp',
    objective: payload.objective || null,
    trigger_phrase: payload.trigger_phrase || null,
    status: payload.status || 'active',
    active: payload.active ?? true,
    created_by: context.profile.id,
    updated_at: new Date().toISOString()
  };

  const query = payload.id
    ? context.service.from('chatbot_flows').update(flowPayload).eq('id', payload.id).eq('company_id', context.profile.company_id).select('*').single()
    : context.service.from('chatbot_flows').insert(flowPayload).select('*').single();

  const { data: flow, error: flowError } = await query;
  if (flowError) return Response.json({ ok: false, error: flowError.message }, { status: 500 });

  if (payload.steps?.length) {
    await context.service.from('chatbot_flow_steps').delete().eq('flow_id', flow.id).eq('company_id', context.profile.company_id);
    const stepPayload = payload.steps
      .filter((step) => step.message?.trim())
      .map((step, index) => ({
        company_id: context.profile.company_id,
        flow_id: flow.id,
        position: Number(step.position || index + 1),
        step_type: step.step_type || 'message',
        message: step.message.trim(),
        delay_minutes: Number(step.delay_minutes || 0)
      }));

    if (stepPayload.length) {
      const { error: stepsError } = await context.service.from('chatbot_flow_steps').insert(stepPayload);
      if (stepsError) return Response.json({ ok: false, error: stepsError.message }, { status: 500 });
    }
  }

  return Response.json({ ok: true, flow });
}
