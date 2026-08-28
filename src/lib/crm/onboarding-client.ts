import { getFreshAccessToken } from '@/lib/supabase/client';

export type OnboardingData = {
  id: string;
  company_id: string;
  status: string;
  current_step: string;
  launch_score: number;
  checklist: Record<string, boolean>;
  notes: string | null;
  completed_at: string | null;
};

export type OnboardingDiagnostics = {
  company_ready: boolean;
  active_users: number;
  products: number;
  active_products: number;
  pipeline_stages: number;
  quick_messages: number;
  open_conversations: number;
  finance_records: number;
  active_flows: number;
  active_rules: number;
  whatsapp_account: boolean;
  whatsapp_provider: boolean;
};

export type OnboardingEvent = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

async function getSessionHeader() {
  return { Authorization: `Bearer ${await getFreshAccessToken()}` };
}

export async function loadOnboarding() {
  const response = await fetch('/api/onboarding', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar onboarding.');
  return {
    onboarding: result.onboarding as OnboardingData,
    company: result.company,
    profiles: result.profiles || [],
    diagnostics: result.diagnostics as OnboardingDiagnostics,
    events: (result.events || []) as OnboardingEvent[]
  };
}

export async function saveOnboarding(payload: { checklist: Record<string, boolean>; current_step: string; status: string; notes: string; }) {
  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify(payload)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar onboarding.');
  return result.onboarding as OnboardingData;
}
