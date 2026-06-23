import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type AIAgentSettings = {
  id?: string;
  agent_name: string;
  enabled: boolean;
  tone: string;
  specialty: string;
  instructions: string;
  handoff_message: string;
  fallback_message: string;
  knowledge_base: string | null;
  auto_suggest: boolean;
  can_create_tasks: boolean;
  can_suggest_products: boolean;
  can_suggest_messages: boolean;
};

export type AIAgentLog = {
  id: string;
  context: string | null;
  prompt: string | null;
  suggestion: string | null;
  action_type: string;
  created_at: string;
};

export const defaultAgentSettings: AIAgentSettings = {
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

async function getSessionHeader() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  return { Authorization: `Bearer ${token}` };
}

export async function loadAIAgent() {
  const response = await fetch('/api/ai-agent', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar Agente Will.');
  return { settings: result.settings as AIAgentSettings, logs: (result.logs || []) as AIAgentLog[], canManage: Boolean(result.canManage) };
}

export async function saveAIAgent(settings: AIAgentSettings) {
  const response = await fetch('/api/ai-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'save', ...settings })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar Agente Will.');
  return result.settings as AIAgentSettings;
}

export async function suggestWithAIAgent(payload: { context: string; customer_message: string; goal: string; }) {
  const response = await fetch('/api/ai-agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'suggest', ...payload })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível gerar sugestão.');
  return result.suggestion as string;
}
