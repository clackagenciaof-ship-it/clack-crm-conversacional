import { getCrmDataMode } from '@/lib/crm/data-mode';
import { mapContactRowToLead, mapOpportunityRowToOpportunity, mapTaskRowToTask } from '@/lib/crm/supabase-mappers';
import { createActivityLog, createContact, createOpportunity, createTask, findStageIdByName, getCurrentProfile, updateOpportunity, updateTask } from '@/lib/supabase/crm-repository';
import type { Lead, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage, Task } from '@/types/crm';

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
};

type TaskForm = {
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: Task['priority'];
  due: string;
};

export function statusFromStage(stage: PipelineStage): OpportunityStatus {
  if (stage === 'Fechado') return 'Ganha';
  if (stage === 'Perdido') return 'Perdida';
  return 'Aberta';
}

async function getRealProfileOrNull() {
  if (getCrmDataMode() !== 'real') return null;

  try {
    const profile = await getCurrentProfile();
    if (!profile?.company_id) return null;
    return profile;
  } catch (error) {
    console.error('Não foi possível recuperar perfil real.', error);
    return null;
  }
}

export async function createRealLeadAndOpportunity(leadForm: LeadForm, leadsLength: number, dealsLength: number) {
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id) return null;

  const contactRow = await createContact({
    company_id: profile.company_id,
    owner_id: profile.id,
    name: leadForm.name,
    phone: leadForm.phone,
    email: leadForm.email || null,
    city: leadForm.city || null,
    origin: leadForm.source,
    temperature: leadForm.temperature,
    status: 'Lead',
    notes: 'Lead criado pelo CLACK CRM.'
  });

  const lead = {
    ...mapContactRowToLead(contactRow, leadsLength),
    owner: leadForm.owner,
    history: ['Lead criado no Supabase pelo CLACK CRM.']
  };

  const stageId = await findStageIdByName(profile.company_id, 'Novo Lead');
  const opportunityRow = await createOpportunity({
    company_id: profile.company_id,
    contact_id: contactRow.id,
    stage_id: stageId,
    stage_name: 'Novo Lead',
    owner_id: profile.id,
    title: 'Nova oportunidade',
    value: 0,
    temperature: leadForm.temperature,
    status: 'Aberta',
    product_interest: 'A definir',
    notes: 'Criada junto ao novo lead.'
  });

  const deal = {
    ...mapOpportunityRowToOpportunity(opportunityRow, lead.id, dealsLength),
    stage: 'Novo Lead' as PipelineStage,
    owner: leadForm.owner,
    source: leadForm.source,
    nextTask: 'Primeiro contato'
  };

  await createActivityLog({
    company_id: profile.company_id,
    contact_id: contactRow.id,
    opportunity_id: opportunityRow.id,
    user_id: profile.id,
    type: 'lead_created',
    description: `Lead ${leadForm.name} criado pelo CRM.`
  });

  return { lead, deal };
}

export async function persistOpportunityStage(deal: Opportunity, stage: PipelineStage) {
  if (!deal.dbId) return;
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id) return;

  const stageId = await findStageIdByName(profile.company_id, stage);
  await updateOpportunity(deal.dbId, { status: statusFromStage(stage), stage_id: stageId, stage_name: stage });
}

export async function persistOpportunityWon(deal: Opportunity, value: number) {
  if (!deal.dbId) return;
  await updateOpportunity(deal.dbId, { value, status: 'Ganha', stage_name: 'Fechado' });
}

export async function persistOpportunityLost(deal: Opportunity, reason: string) {
  if (!deal.dbId) return;
  await updateOpportunity(deal.dbId, { status: 'Perdida', stage_name: 'Perdido', lost_reason: reason, notes: `${deal.notes} Motivo da perda: ${reason}.` });
}

export async function createRealTask(taskForm: TaskForm, selectedLead: Lead | undefined, tasksLength: number) {
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id || !selectedLead?.dbId) return null;

  const taskRow = await createTask({
    company_id: profile.company_id,
    contact_id: selectedLead.dbId,
    owner_id: profile.id,
    title: taskForm.title,
    description: `Prazo informado: ${taskForm.due}`,
    type: taskForm.type,
    priority: taskForm.priority,
    status: 'Pendente'
  });

  return {
    ...mapTaskRowToTask(taskRow, selectedLead.id, tasksLength),
    leadName: selectedLead.name,
    owner: `${selectedLead.name} / ${taskForm.owner}`,
    due: taskForm.due
  };
}

export async function persistTaskCompleted(task: Task | undefined) {
  if (!task?.dbId) return;
  await updateTask(task.dbId, { status: 'Concluída' });
}
