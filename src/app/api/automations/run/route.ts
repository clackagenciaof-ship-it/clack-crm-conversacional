import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type AutomationRule = {
  id: string;
  company_id: string;
  name: string;
  trigger_type: string;
  action_type: string;
  stage_name: string | null;
  delay_minutes: number;
  message: string | null;
  active: boolean;
  config: Record<string, any> | null;
};

function canRunAutomations(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

function dueDateFromDelay(minutes: number) {
  return new Date(Date.now() + Math.max(0, minutes) * 60000).toISOString();
}

async function alreadyRanToday(service: any, ruleId: string, targetType: string, targetId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await service
    .from('automation_runs')
    .select('id')
    .eq('automation_rule_id', ruleId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .gte('created_at', since)
    .limit(1);
  return Boolean(data?.length);
}

async function createTaskForTarget(params: { context: any; rule: AutomationRule; targetType: string; targetId: string; contactId?: string | null; title: string; result: string }) {
  const { context, rule, targetType, targetId, contactId, title, result } = params;
  if (await alreadyRanToday(context.service, rule.id, targetType, targetId)) return { skipped: true };

  const priority = rule.config?.priority || 'Média';
  const type = rule.config?.task_type || 'Automação';
  const message = rule.message || title;
  const { data: task, error: taskError } = await context.service.from('tasks').insert({
    company_id: context.profile.company_id,
    contact_id: contactId || null,
    owner_id: context.profile.id,
    title,
    description: message,
    type,
    priority,
    status: 'Pendente',
    due_at: dueDateFromDelay(rule.delay_minutes)
  }).select('*').single();

  if (taskError) throw taskError;

  await context.service.from('automation_runs').insert({
    company_id: context.profile.company_id,
    automation_rule_id: rule.id,
    target_type: targetType,
    target_id: targetId,
    status: 'executed',
    result
  });

  return { task };
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canRunAutomations(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para executar automações.' }, { status: 403 });

  const { data: rules, error: rulesError } = await context.service
    .from('automation_rules')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .eq('active', true);

  if (rulesError) return Response.json({ ok: false, error: rulesError.message }, { status: 500 });

  let executed = 0;
  let skipped = 0;
  const details: string[] = [];

  for (const rule of (rules || []) as AutomationRule[]) {
    if (rule.trigger_type === 'lead_hot_idle') {
      const { data: contacts } = await context.service
        .from('contacts')
        .select('id, name, temperature, status')
        .eq('company_id', context.profile.company_id)
        .eq('temperature', 'Quente')
        .neq('status', 'Arquivado')
        .limit(25);

      for (const contact of contacts || []) {
        const result = await createTaskForTarget({ context, rule, targetType: 'contact', targetId: contact.id, contactId: contact.id, title: `Follow-up automático: ${contact.name}`, result: `Tarefa criada para lead quente ${contact.name}` });
        if (result.skipped) skipped += 1; else executed += 1;
      }
      details.push(`${rule.name}: ${contacts?.length || 0} lead(s) avaliados`);
    }

    if (rule.trigger_type === 'opportunity_stage_idle') {
      const stageName = rule.stage_name || 'Proposta Enviada';
      const { data: opportunities } = await context.service
        .from('opportunities')
        .select('id, contact_id, title, stage_name, status')
        .eq('company_id', context.profile.company_id)
        .eq('stage_name', stageName)
        .eq('status', 'Aberta')
        .limit(25);

      for (const opportunity of opportunities || []) {
        const result = await createTaskForTarget({ context, rule, targetType: 'opportunity', targetId: opportunity.id, contactId: opportunity.contact_id, title: `Retomar oportunidade: ${opportunity.title}`, result: `Tarefa criada para oportunidade em ${stageName}` });
        if (result.skipped) skipped += 1; else executed += 1;
      }
      details.push(`${rule.name}: ${opportunities?.length || 0} oportunidade(s) avaliadas`);
    }

    if (rule.trigger_type === 'conversation_open') {
      const { data: conversations } = await context.service
        .from('whatsapp_conversations')
        .select('id, contact_id, customer_name, customer_phone, status')
        .eq('company_id', context.profile.company_id)
        .in('status', ['Aberta', 'Em atendimento'])
        .limit(25);

      for (const conversation of conversations || []) {
        const title = `Atendimento automático: ${conversation.customer_name || conversation.customer_phone}`;
        const result = await createTaskForTarget({ context, rule, targetType: 'conversation', targetId: conversation.id, contactId: conversation.contact_id, title, result: 'Tarefa criada para conversa aberta' });
        if (result.skipped) skipped += 1; else executed += 1;
      }
      details.push(`${rule.name}: ${conversations?.length || 0} conversa(s) avaliadas`);
    }
  }

  return Response.json({ ok: true, executed, skipped, details });
}
