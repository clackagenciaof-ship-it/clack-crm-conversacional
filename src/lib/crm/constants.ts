import type { CrmUser, PipelineStage } from '@/types/crm';

export const CRM_APP_NAME = 'CLACK CRM Conversacional';

export const PIPELINE_STAGES: PipelineStage[] = [
  'Novo Lead',
  'Primeiro Contato',
  'Qualificação',
  'Apresentação Enviada',
  'Proposta Enviada',
  'Negociação',
  'Fechado',
  'Perdido'
];

export const LEAD_SOURCES = [
  'Instagram',
  'WhatsApp',
  'Indicação',
  'Tráfego Pago',
  'Site',
  'Campanha Comercial',
  'Blitz'
];

export const CRM_USERS: CrmUser[] = [
  { id: 1, name: 'Will Sampaio', role: 'Admin Empresa', email: 'will@clackcrm.com.br' },
  { id: 2, name: 'Amanda', role: 'Gestor', email: 'amanda@clackcrm.com.br' },
  { id: 3, name: 'Lucas', role: 'Vendedor', email: 'lucas@clackcrm.com.br' },
  { id: 4, name: 'Daniela', role: 'Atendente', email: 'daniela@clackcrm.com.br' }
];

export const FUTURE_MODULES = [
  'Automação comercial',
  'Pagamentos InfinitePay',
  'WhatsApp Cloud API',
  'Webhooks',
  'White label',
  'Inteligência Artificial'
];

export const LOSS_REASONS = [
  'Sem orçamento',
  'Sem interesse',
  'Comprou do concorrente',
  'Não respondeu',
  'Preço alto',
  'Fora da área de atendimento',
  'Lead duplicado',
  'Outro'
];
