import type { Lead, LeadStatus, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage, QuickMessage, Task, TaskPriority, TaskStatus } from '@/types/crm';
import type { Database } from '@/lib/supabase/database.types';

type ContactRow = Database['public']['Tables']['contacts']['Row'];
type OpportunityRow = Database['public']['Tables']['opportunities']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type QuickMessageRow = Database['public']['Tables']['quick_messages']['Row'];

function numericIdFromUuid(uuid: string, fallback: number) {
  return Number.parseInt(uuid.replace(/\D/g, '').slice(0, 10), 10) || fallback;
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

function normalizeOpportunityStage(status: OpportunityStatus): PipelineStage {
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

  return {
    id: numericIdFromUuid(row.id, index + 1),
    dbId: row.id,
    leadId,
    title: row.title,
    value: row.value || 0,
    stage: normalizeOpportunityStage(status),
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
    due: row.due_at || row.description || 'Sem prazo',
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
