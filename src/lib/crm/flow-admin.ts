import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type ChatbotFlow = {
  id: string;
  company_id: string;
  name: string;
  channel: string;
  objective: string | null;
  trigger_phrase: string | null;
  status: string;
  active: boolean;
  created_at: string;
};

export type ChatbotFlowStep = {
  id: string;
  company_id: string;
  flow_id: string;
  position: number;
  step_type: string;
  message: string;
  delay_minutes: number;
};

export type FlowForm = {
  id?: string;
  name: string;
  channel: string;
  objective: string;
  trigger_phrase: string;
  status: string;
  active: boolean;
  steps: Array<{ position: number; step_type: string; message: string; delay_minutes: number }>;
};

async function getSessionHeader() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const sessionToken = data.session?.access_token;
  if (!sessionToken) throw new Error('Sessão expirada. Entre novamente no CRM.');
  return { Authorization: `Bearer ${sessionToken}` };
}

export async function loadChatbotFlows() {
  const response = await fetch('/api/automation-flows', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar fluxos automáticos.');
  return { flows: (result.flows || []) as ChatbotFlow[], steps: (result.steps || []) as ChatbotFlowStep[] };
}

export async function saveChatbotFlow(form: FlowForm) {
  const response = await fetch('/api/automation-flows', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify(form)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar fluxo automático.');
  return result.flow as ChatbotFlow;
}
