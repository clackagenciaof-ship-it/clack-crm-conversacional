import type { Screen, UserRole } from '@/types/crm';

export const roleLabels: Record<UserRole, string> = {
  'Admin Empresa': 'Admin Empresa — acesso total',
  Gestor: 'Gestor — equipe, relatórios e funil',
  Vendedor: 'Vendedor — próprios leads e oportunidades',
  Atendente: 'Atendente — cadastro e atendimento',
  Financeiro: 'Financeiro — vendas fechadas e valores'
};

export const roleDescriptions: Record<UserRole, string> = {
  'Admin Empresa': 'Acesso total ao CRM, configurações, funil, atendimento, relatórios e módulos estratégicos.',
  Gestor: 'Acompanha equipe, funil, indicadores, atendimento, tarefas, mensagens e relatórios comerciais.',
  Vendedor: 'Trabalha leads, oportunidades, tarefas e mensagens rápidas do processo comercial.',
  Atendente: 'Foca em atendimento, cadastro, follow-up e mensagens rápidas.',
  Financeiro: 'Acompanha indicadores, relatórios, vendas fechadas e valores do funil.'
};

export const roleScreens: Record<UserRole, Screen[]> = {
  'Admin Empresa': ['dashboard', 'leads', 'kanban', 'tasks', 'messages', 'inbox', 'reports', 'settings'],
  Gestor: ['dashboard', 'leads', 'kanban', 'tasks', 'messages', 'inbox', 'reports', 'settings'],
  Vendedor: ['dashboard', 'leads', 'kanban', 'tasks', 'messages'],
  Atendente: ['leads', 'tasks', 'messages', 'inbox'],
  Financeiro: ['dashboard', 'kanban', 'reports']
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
