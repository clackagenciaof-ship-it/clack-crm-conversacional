import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type RulePayload = {
  id?: string;
  name?: string;
  description?: string;
  trigger_type?: string;
  action_type?: string;
  stage_name?: string | null;
  delay_minutes?: number;
  message?: string;
  active?: boolean;
  config?: Record<string, unknown>;
};

function canManageAutomations(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const { data: rules, error: rulesError } = await context.service
    .from('automation_rules')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .order('created_at', { ascending: false });

  if (rulesError) return Response.json({ ok: false, error: rulesError.message }, { status: 500 });

  const { data: runs } = await context.service
    .from('automation_runs')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .order('created_at', { ascending: false })
    .limit(20);

  return Response.json({ ok: true, rules: rules || [], runs: runs || [] });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageAutomations(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar automações.' }, { status: 403 });

  let payload: RulePayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  if (!payload.name?.trim()) return Response.json({ ok: false, error: 'Nome da automação é obrigatório.' }, { status: 400 });
  if (!payload.trigger_type) return Response.json({ ok: false, error: 'Gatilho é obrigatório.' }, { status: 400 });

  const rulePayload = {
    company_id: context.profile.company_id,
    name: payload.name.trim(),
    description: payload.description || null,
    trigger_type: payload.trigger_type,
    action_type: payload.action_type || 'create_task',
    stage_name: payload.stage_name || null,
    delay_minutes: Number(payload.delay_minutes || 0),
    message: payload.message || null,
    active: payload.active ?? true,
    config: payload.config || {},
    created_by: context.profile.id,
    updated_at: new Date().toISOString()
  };

  const query = payload.id
    ? context.service.from('automation_rules').update(rulePayload).eq('id', payload.id).eq('company_id', context.profile.company_id).select('*').single()
    : context.service.from('automation_rules').insert(rulePayload).select('*').single();

  const { data: rule, error: saveError } = await query;
  if (saveError) return Response.json({ ok: false, error: saveError.message }, { status: 500 });

  return Response.json({ ok: true, rule });
}
