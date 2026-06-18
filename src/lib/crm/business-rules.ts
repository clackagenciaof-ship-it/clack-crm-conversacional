import type { Lead, Opportunity, PipelineStage, Task } from '@/types/crm';
import { normalizePhoneBR } from './formatters';

export function validateLeadRequiredFields(input: Pick<Lead, 'name' | 'phone'>) {
  const errors: string[] = [];

  if (!input.name?.trim()) errors.push('Nome do lead é obrigatório.');
  if (!input.phone?.trim()) errors.push('WhatsApp do lead é obrigatório.');

  return errors;
}

export function hasDuplicatePhone(leads: Lead[], phone: string) {
  const normalized = normalizePhoneBR(phone);
  return leads.some((lead) => normalizePhoneBR(lead.phone) === normalized);
}

export function validateOpportunityBeforeWon(opportunity: Opportunity, finalValue?: number) {
  const errors: string[] = [];

  if (!opportunity.leadId) errors.push('A oportunidade precisa estar vinculada a um contato.');
  if (!opportunity.owner) errors.push('A oportunidade precisa ter um responsável.');
  if (!finalValue || finalValue <= 0) errors.push('Venda ganha exige valor final maior que zero.');

  return errors;
}

export function validateOpportunityBeforeLost(reason?: string) {
  return reason?.trim() ? [] : ['Venda perdida exige motivo de perda.'];
}

export function validateTaskRequiredFields(input: Pick<Task, 'title' | 'owner' | 'due'>) {
  const errors: string[] = [];

  if (!input.title?.trim()) errors.push('A tarefa precisa de título.');
  if (!input.owner?.trim()) errors.push('A tarefa precisa de responsável.');
  if (!input.due?.trim()) errors.push('A tarefa precisa de data ou prazo.');

  return errors;
}

export function mapStageToOpportunityStatus(stage: PipelineStage) {
  if (stage === 'Fechado') return 'Ganha';
  if (stage === 'Perdido') return 'Perdida';
  return 'Aberta';
}
