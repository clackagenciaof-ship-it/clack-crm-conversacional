import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type AgentPayload = {
  action?: 'save' | 'suggest';
  agent_name?: string;
  enabled?: boolean;
  tone?: string;
  specialty?: string;
  instructions?: string;
  handoff_message?: string;
  fallback_message?: string;
  knowledge_base?: string;
  auto_suggest?: boolean;
  can_create_tasks?: boolean;
  can_suggest_products?: boolean;
  can_suggest_messages?: boolean;
  context?: string;
  customer_message?: string;
  goal?: string;
};

function canManageAgent(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

const fallbackSettings = {
  agent_name: 'Will',
  enabled: true,
  tone: 'Consultivo, humano, objetivo e comercial',
  specialty: 'Vendas, atendimento, follow-up, recuperação de proposta e gestão comercial',
  instructions: 'Ajude a equipe a vender mais, responder com clareza, priorizar oportunidades e manter o histórico organizado no CRM.',
  handoff_message: 'Vou chamar um especialista da equipe para continuar com você.',
  fallback_message: 'Entendi. Vou registrar aqui e direcionar para o melhor atendimento.',
  knowledge_base: '',
  auto_suggest: true,
  can_create_tasks: true,
  can_suggest_products: true,
  can_suggest_messages: true
};

function buildSuggestion(settings: typeof fallbackSettings, payload: AgentPayload, products: any[]) {
  const message = (payload.customer_message || '').toLowerCase();
  const goal = payload.goal || 'Atendimento comercial';
  const hasPrice = ['preço', 'valor', 'quanto', 'orçamento', 'proposta'].some((term) => message.includes(term));
  const hasDoubt = ['dúvida', 'duvida', 'como funciona', 'explica', 'entender'].some((term) => message.includes(term));
  const hasUrgency = ['urgente', 'hoje', 'agora', 'rápido', 'rapido'].some((term) => message.includes(term));
  const product = products?.[0];

  const opening = `Olá! Aqui é ${settings.agent_name}, da equipe comercial. Obrigado pelo contato.`;
  const consultive = hasDoubt ? 'Vou te explicar de forma simples para ficar claro e você decidir com segurança.' : 'Vou te ajudar a avançar com a melhor solução para sua necessidade.';
  const priceLine = hasPrice && product ? `Temos a solução ${product.name}, com referência a partir de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(product.price || 0))}.` : 'Para te passar a proposta certa, preciso entender rapidamente seu cenário.';
  const urgency = hasUrgency ? 'Como você sinalizou urgência, posso priorizar seu atendimento e encaminhar agora para um consultor.' : 'Posso seguir com algumas perguntas rápidas para direcionar melhor?';
  const next = 'Me diga: seu nome, cidade, principal necessidade e se deseja atendimento para venda, suporte ou implantação.';

  return `${opening}\n\n${consultive}\n${priceLine}\n${urgency}\n\n${next}\n\nObjetivo interno: ${goal}.`;
}

async function ensureSettings(context: any) {
  const companyId = context.profile.company_id;
  let { data: settings, error } = await context.service.from('ai_agent_settings').select('*').eq('company_id', companyId).maybeSingle();
  if (error) throw error;
  if (!settings) {
    const { data: created, error: createError } = await context.service.from('ai_agent_settings').insert({ ...fallbackSettings, company_id: companyId, created_by: context.profile.id }).select('*').single();
    if (createError) throw createError;
    settings = created;
  }
  return settings;
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  try {
    const [settings, logsResult] = await Promise.all([
      ensureSettings(context),
      context.service.from('ai_agent_logs').select('*').eq('company_id', context.profile.company_id).order('created_at', { ascending: false }).limit(20)
    ]);
    return Response.json({ ok: true, settings, logs: logsResult.data || [], canManage: canManageAgent(context.profile.role) });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Não foi possível carregar Agente Will.';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  let payload: AgentPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  const companyId = context.profile.company_id;
  const settings = await ensureSettings(context);

  if (payload.action === 'suggest') {
    const { data: products } = await context.service.from('product_services').select('name, price, category, description').eq('company_id', companyId).eq('status', 'Ativo').limit(3);
    const suggestion = buildSuggestion(settings, payload, products || []);
    await context.service.from('ai_agent_logs').insert({ company_id: companyId, agent_settings_id: settings.id, profile_id: context.profile.id, context: payload.context || null, prompt: payload.customer_message || null, suggestion, action_type: 'suggestion' });
    return Response.json({ ok: true, suggestion });
  }

  if (!canManageAgent(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para configurar IA.' }, { status: 403 });

  const clean = {
    agent_name: payload.agent_name?.trim() || fallbackSettings.agent_name,
    enabled: payload.enabled ?? true,
    tone: payload.tone?.trim() || fallbackSettings.tone,
    specialty: payload.specialty?.trim() || fallbackSettings.specialty,
    instructions: payload.instructions?.trim() || fallbackSettings.instructions,
    handoff_message: payload.handoff_message?.trim() || fallbackSettings.handoff_message,
    fallback_message: payload.fallback_message?.trim() || fallbackSettings.fallback_message,
    knowledge_base: payload.knowledge_base?.trim() || null,
    auto_suggest: payload.auto_suggest ?? true,
    can_create_tasks: payload.can_create_tasks ?? true,
    can_suggest_products: payload.can_suggest_products ?? true,
    can_suggest_messages: payload.can_suggest_messages ?? true,
    updated_at: new Date().toISOString()
  };

  const { data, error: updateError } = await context.service.from('ai_agent_settings').update(clean).eq('company_id', companyId).select('*').single();
  if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
  return Response.json({ ok: true, settings: data });
}
