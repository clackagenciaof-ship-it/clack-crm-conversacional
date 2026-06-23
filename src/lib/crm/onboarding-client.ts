import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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
  active_users: number;
  products: number;
  active_products: number;
  pipeline_stages: number;
  active_flows: number;
};

export type OnboardingEvent = {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
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
