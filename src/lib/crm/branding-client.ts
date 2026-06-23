import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type CompanyBranding = {
  id?: string;
  app_name: string;
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  sidebar_color: string;
  welcome_title: string;
  welcome_subtitle: string;
  custom_domain: string | null;
  white_label_enabled: boolean;
  status: string;
};

export const defaultBranding: CompanyBranding = {
  app_name: 'CLACK CRM',
  brand_name: 'CLACK CRM Conversacional',
  logo_url: null,
  favicon_url: null,
  primary_color: '#005954',
  secondary_color: '#338b85',
  accent_color: '#5dc1b9',
  background_color: '#f4fffe',
  sidebar_color: '#005954',
  welcome_title: 'Venda mais, atenda melhor e acompanhe seu funil em tempo real.',
  welcome_subtitle: 'Seu CRM inteligente de vendas e atendimento.',
  custom_domain: null,
  white_label_enabled: true,
  status: 'Ativo'
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

export async function loadBranding() {
  const response = await fetch('/api/branding', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar white label.');
  return { branding: result.branding as CompanyBranding, canManage: Boolean(result.canManage) };
}

export async function saveBranding(branding: CompanyBranding) {
  const response = await fetch('/api/branding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify(branding)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar white label.');
  return result.branding as CompanyBranding;
}

export function applyBranding(branding: CompanyBranding) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--deep', branding.primary_color || defaultBranding.primary_color);
  root.style.setProperty('--primary', branding.secondary_color || defaultBranding.secondary_color);
  root.style.setProperty('--accent', branding.accent_color || defaultBranding.accent_color);
  root.style.setProperty('--bg', branding.background_color || defaultBranding.background_color);
  root.style.setProperty('--grad', `linear-gradient(135deg, ${branding.primary_color} 0%, ${branding.secondary_color} 48%, ${branding.accent_color} 100%)`);
  root.style.setProperty('--grad-soft', `linear-gradient(135deg, ${branding.primary_color}24, ${branding.accent_color}38)`);
  document.title = branding.app_name || defaultBranding.app_name;
}
