import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type AutomationRule = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  trigger_type: string;
  action_type: string;
  stage_name: string | null;
  delay_minutes: number;
  message: string | null;
  active: boolean;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type AutomationRun = {
  id: string;
  automation_rule_id: string | null;
  target_type: string | null;
  target_id: string | null;
  status: string;
  result: string | null;
  created_at: string;
};

export type AutomationForm = {
  id?: string;
  name: string;
  description: string;
  trigger_type: string;
  action_type: string;
  stage_name: string;
  delay_minutes: number;
  message: string;
  active: boolean;
  config: Record<string, unknown>;
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

export async function loadAutomations() {
  const response = await fetch('/api/automations/rules', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar automações.');
  return { rules: (result.rules || []) as AutomationRule[], runs: (result.runs || []) as AutomationRun[] };
}

export async function saveAutomationRule(form: AutomationForm) {
  const response = await fetch('/api/automations/rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify(form)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar automação.');
  return result.rule as AutomationRule;
}

export async function toggleAutomationRule(id: string, active: boolean) {
  const response = await fetch('/api/automations/rules/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ id, active })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível atualizar automação.');
  return result.rule as AutomationRule;
}

export async function runAutomationsNow() {
  const response = await fetch('/api/automations/run', {
    method: 'POST',
    headers: await getSessionHeader()
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível executar automações.');
  return result as { ok: boolean; executed: number; skipped: number; details: string[] };
}
