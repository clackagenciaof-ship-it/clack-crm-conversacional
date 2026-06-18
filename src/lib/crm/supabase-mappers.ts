import type { Lead, LeadStatus, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage, QuickMessage, Task, TaskPriority, TaskStatus } from '@/types/crm';
import type { Database } from '@/lib/supabase/database.types';

type ContactRow = Database['public']['Tables']['contacts']['Row'];
type OpportunityRow = Database['public']['Tables']['opportunities']['Row'] & {
  pipeline_stages?: { name?: string | null } | null;
};
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type QuickMessageRow = Database['public']['Tables']['quick_messages']['Row'];

const pipelineStages: PipelineStage[] = [
  'Novo Lead',
  'Primeiro Contato',
  'Qualificação',
  'Apresentação Enviada',
  'Proposta Enviada',
  'Negociação',
  'Fechado',
  'Perdido'
];

function numericIdFromUuid(uuid: string, fallback: number) {
  // Usamos o índice visual como base para evitar colisões numéricas entre UUIDs.
  return fallback;
}

function normalizeTemperature(value: string | null | undefined): LeadTemperature {
  if (value === 'Morno' || value === 'Frio') return value;
  return 'Quente';
}

function normalizeLeadStatus(value: string | null | undefined): LeadStatus {
  if (value === 'Cliente' || value === 'Inativo' || value === 'Arquivado') return value;
  return 'Lead';
}

function normalizeOpportunityStatus(value: string | null | undefined): OpportunityStatus {
  if (value === 'Ganha' || value === 'Perdida' || value === 'Arquivada') return value;
  return 'Aberta';
}

function normalizeOpportunityStage(status: OpportunityStatus, stageName?: string | null): PipelineStage {
  if (stageName && pipelineStages.includes(stageName as PipelineStage)) return stageName as PipelineStage;
  if (status === 'Ganha') return 'Fechado';
  if (status === 'Perdida') return 'Perdido';
  return 'Novo Lead';
}

function normalizeTaskStatus(value: string | null | undefined): TaskStatus {
  if (value === 'Em andamento' || value === 'Concluída' || value === 'Vencida' || value === 'Cancelada') return value;
  return 'Pendente';
}

function normalizePriority(value: string | null | undefined): TaskPriority {
  if (value === 'Baixa' || value === 'Alta') return value;
  return 'Média';
}

function formatDue(value: string | null | undefined, fallback?: string | null) {
  if (fallback?.startsWith('Prazo informado: ')) return fallback.replace('Prazo informado: ', '');
  if (!value) return fallback || 'Sem prazo';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function mapContactRowToLead(row: ContactRow, index = 0): Lead {
  return {
    id: numericIdFromUuid(row.id, index + 1),
    dbId: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || '',
    city: row.city || '',
    source: row.origin || 'Manual',
    owner: 'Equipe',
    temperature: normalizeTemperature(row.temperature),
    status: normalizeLeadStatus(row.status),
    lastInteraction: 'agora',
    tags: [],
    history: row.notes ? [row.notes] : []
  };
}

export function mapOpportunityRowToOpportunity(row: OpportunityRow, leadId: number, index = 0): Opportunity {
  const status = normalizeOpportunityStatus(row.status);
  const stageName = row.pipeline_stages?.name;

  return {
    id: numericIdFromUuid(row.id, index + 1),
    dbId: row.id,
    leadId,
    title: row.title,
    value: row.value || 0,
    stage: normalizeOpportunityStage(status, stageName),
    owner: 'Equipe',
    source: 'Banco real',
    temperature: normalizeTemperature(row.temperature),
    nextTask: 'Próximo contato',
    late: false,
    status,
    notes: row.notes || ''
  };
}

export function mapTaskRowToTask(row: TaskRow, leadId: number, index = 0): Task {
  return {
    id: numericIdFromUuid(row.id, index + 1),
    dbId: row.id,
    leadId,
    owner: 'Equipe',
    title: row.title,
    type: row.type || 'Outro',
    priority: normalizePriority(row.priority),
    due: formatDue(row.due_at, row.description),
    status: normalizeTaskStatus(row.status)
  };
}

export function mapQuickMessageRowToQuickMessage(row: QuickMessageRow, index = 0): QuickMessage {
  return {
    id: numericIdFromUuid(row.id, index + 1),
    dbId: row.id,
    title: row.title,
    category: row.category,
    active: row.active,
    text: row.content
  };
}
