import { getFreshAccessToken } from '@/lib/supabase/client';

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
  primary_color: '#0FA3B1',
  secondary_color: '#B5E2FA',
  accent_color: '#F7A072',
  background_color: '#F9F7F3',
  sidebar_color: '#10282C',
  welcome_title: 'Venda mais, atenda melhor e acompanhe seu funil em tempo real.',
  welcome_subtitle: 'Seu CRM inteligente de vendas e atendimento.',
  custom_domain: null,
  white_label_enabled: true,
  status: 'Ativo'
};

async function getSessionHeader() {
  return { Authorization: `Bearer ${await getFreshAccessToken()}` };
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
  root.style.setProperty('--primary', branding.primary_color || defaultBranding.primary_color);
  root.style.setProperty('--sky', branding.secondary_color || defaultBranding.secondary_color);
  root.style.setProperty('--accent', branding.accent_color || defaultBranding.accent_color);
  root.style.setProperty('--bg', branding.background_color || defaultBranding.background_color);
  root.style.setProperty('--sidebar', branding.sidebar_color || defaultBranding.sidebar_color);
  root.style.setProperty('--grad', `linear-gradient(135deg, ${branding.primary_color} 0%, ${branding.secondary_color} 58%, ${branding.accent_color} 100%)`);
  root.style.setProperty('--grad-soft', `linear-gradient(135deg, ${branding.secondary_color}66, ${branding.background_color} 68%, #EDDEA455 100%)`);
  document.title = branding.app_name || defaultBranding.app_name;
}
