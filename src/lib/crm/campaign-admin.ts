import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type MessageCampaign = {
  id: string;
  company_id: string;
  name: string;
  segment_type: string;
  channel: string;
  message: string;
  status: string;
  total_recipients: number;
  created_at: string;
};

export type CampaignForm = {
  name: string;
  segment_type: string;
  message: string;
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

export async function loadCampaigns() {
  const response = await fetch('/api/campaigns', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar disparos.');
  return (result.campaigns || []) as MessageCampaign[];
}

export async function createCampaign(form: CampaignForm) {
  const response = await fetch('/api/campaigns', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify(form)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível preparar disparo.');
  return result.campaign as MessageCampaign;
}
