import type { Screen, UserRole } from '@/types/crm';

export const roleLabels: Record<UserRole,string>={
  'Admin Empresa':'Administrador — operação completa',
  Gestor:'Gestor — gestão, equipe e resultado',
  Vendedor:'Vendedor — carteira, pipeline e atendimento',
  Atendente:'Atendimento — conversas, contatos e execução',
  Financeiro:'Financeiro — recebimentos e resultado'
};

export const roleDescriptions:Record<UserRole,string>={
  'Admin Empresa':'Controla empresa, equipe, integrações, atendimento, vendas, catálogo, financeiro, relatórios, implantação e verticais.',
  Gestor:'Acompanha execução, atendimento, pipeline, equipe, indicadores, catálogo, financeiro e configuração operacional.',
  Vendedor:'Trabalha contatos, oportunidades, tarefas, conversas, mensagens e catálogo, com apoio do ONE Core.',
  Atendente:'Centraliza atendimento, cadastro, tarefas, modelos de mensagem, catálogo e Público 360 quando habilitado.',
  Financeiro:'Conecta vendas ganhas a recebimentos, acompanha valores, relatórios e catálogo.'
};

export const roleScreens:Record<UserRole,Screen[]>={
  'Admin Empresa':['dashboard','leads','kanban','tasks','messages','inbox','intelligence','public-engagement','products','reports','finance','onboarding','settings'],
  Gestor:['dashboard','leads','kanban','tasks','messages','inbox','intelligence','public-engagement','products','reports','finance','onboarding','settings'],
  Vendedor:['dashboard','leads','kanban','tasks','messages','inbox','intelligence','products'],
  Atendente:['leads','tasks','messages','inbox','public-engagement','products'],
  Financeiro:['dashboard','kanban','products','reports','finance']
};

export function normalizeRole(role?:string|null):UserRole{
  const normalized=(role||'').trim().toLowerCase();
  if(normalized.includes('gestor'))return'Gestor';
  if(normalized.includes('vendedor'))return'Vendedor';
  if(normalized.includes('atendente'))return'Atendente';
  if(normalized.includes('financeiro'))return'Financeiro';
  return'Admin Empresa';
}
export function canAccessScreen(role:UserRole,screen:Screen){return roleScreens[role].includes(screen)}
export function getDefaultScreenForRole(role:UserRole):Screen{return roleScreens[role][0]||'dashboard'}
