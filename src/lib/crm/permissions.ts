import type { Screen, UserRole } from '@/types/crm';

export const roleLabels: Record<UserRole, string> = {
  'Admin Empresa': 'Admin Empresa — acesso total',
  Gestor: 'Gestor — equipe, relatórios e funil',
  Vendedor: 'Vendedor — próprios leads e oportunidades',
  Atendente: 'Atendente — cadastro e atendimento',
  Financeiro: 'Financeiro — vendas fechadas e valores'
};

export const roleDescriptions: Record<UserRole, string> = {
  'Admin Empresa': 'Acesso total ao CRM, configurações, funil, atendimento, relatórios, produtos, onboarding, financeiro e módulos estratégicos.',
  Gestor: 'Acompanha equipe, funil, indicadores, produtos, onboarding, atendimento, tarefas, mensagens, financeiro e relatórios comerciais.',
  Vendedor: 'Trabalha leads, oportunidades, catálogo de produtos, tarefas e mensagens rápidas do processo comercial.',
  Atendente: 'Foca em atendimento, cadastro, catálogo consultivo, follow-up e mensagens rápidas.',
  Financeiro: 'Acompanha indicadores, relatórios, vendas fechadas, recebimentos, valores e catálogo de cobrança.'
};

export const roleScreens: Record<UserRole, Screen[]> = {
  'Admin Empresa': ['dashboard', 'leads', 'kanban', 'tasks', 'messages', 'inbox', 'products', 'reports', 'finance', 'onboarding', 'settings'],
  Gestor: ['dashboard', 'leads', 'kanban', 'tasks', 'messages', 'inbox', 'products', 'reports', 'finance', 'onboarding', 'settings'],
  Vendedor: ['dashboard', 'leads', 'kanban', 'tasks', 'messages', 'products'],
  Atendente: ['leads', 'tasks', 'messages', 'inbox', 'products'],
  Financeiro: ['dashboard', 'kanban', 'products', 'reports', 'finance']
};

export function normalizeRole(role?: string | null): UserRole {
  const normalized = (role || '').trim().toLowerCase();
  if (normalized.includes('gestor')) return 'Gestor';
  if (normalized.includes('vendedor')) return 'Vendedor';
  if (normalized.includes('atendente')) return 'Atendente';
  if (normalized.includes('financeiro')) return 'Financeiro';
  return 'Admin Empresa';
}

export function canAccessScreen(role: UserRole, screen: Screen) {
  return roleScreens[role].includes(screen);
}

export function getDefaultScreenForRole(role: UserRole): Screen {
  return roleScreens[role][0] || 'dashboard';
}
