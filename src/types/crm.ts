export type Screen = 'dashboard' | 'leads' | 'kanban' | 'tasks' | 'messages' | 'reports' | 'settings';

export type LeadTemperature = 'Quente' | 'Morno' | 'Frio';

export type LeadStatus = 'Lead' | 'Cliente' | 'Inativo' | 'Arquivado';

export type OpportunityStatus = 'Aberta' | 'Ganha' | 'Perdida' | 'Arquivada';

export type PipelineStage =
  | 'Novo Lead'
  | 'Primeiro Contato'
  | 'Qualificação'
  | 'Apresentação Enviada'
  | 'Proposta Enviada'
  | 'Negociação'
  | 'Fechado'
  | 'Perdido';

export type TaskStatus = 'Pendente' | 'Em andamento' | 'Concluída' | 'Vencida' | 'Cancelada';

export type TaskPriority = 'Baixa' | 'Média' | 'Alta';

export type UserRole = 'Admin Empresa' | 'Gestor' | 'Vendedor' | 'Atendente' | 'Financeiro';

export type CrmUser = {
  id: number;
  name: string;
  role: UserRole;
  email?: string;
};

export type Lead = {
  id: number;
  dbId?: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
  status: LeadStatus;
  lastInteraction: string;
  tags: string[];
  history: string[];
};

export type Opportunity = {
  id: number;
  dbId?: string;
  leadId: number;
  title: string;
  value: number;
  stage: PipelineStage;
  owner: string;
  source: string;
  temperature: LeadTemperature;
  nextTask: string;
  late: boolean;
  status: OpportunityStatus;
  notes: string;
};

export type Task = {
  id: number;
  dbId?: string;
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: TaskPriority;
  due: string;
  status: TaskStatus;
};

export type QuickMessage = {
  id: number;
  dbId?: string;
  title: string;
  category: string;
  active: boolean;
  text: string;
};
