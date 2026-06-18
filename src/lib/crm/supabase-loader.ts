import { getCurrentProfile, listContacts, listOpportunities, listPipelineStages, listQuickMessages, listTasks } from '@/lib/supabase/crm-repository';
import { mapContactRowToLead, mapOpportunityRowToOpportunity, mapQuickMessageRowToQuickMessage, mapTaskRowToTask } from '@/lib/crm/supabase-mappers';
import type { Database } from '@/lib/supabase/database.types';
import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

type ContactRow = Database['public']['Tables']['contacts']['Row'];
type OpportunityRow = Database['public']['Tables']['opportunities']['Row'] & {
  pipeline_stages?: { name?: string | null } | null;
};
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type QuickMessageRow = Database['public']['Tables']['quick_messages']['Row'];

type CrmSnapshot = {
  leads: Lead[];
  deals: Opportunity[];
  tasks: Task[];
  messages: QuickMessage[];
  notice: string;
};

export async function loadCrmSnapshotFromSupabase(): Promise<CrmSnapshot | null> {
  const profile = await getCurrentProfile();

  if (!profile?.company_id) {
    return {
      leads: [],
      deals: [],
      tasks: [],
      messages: [],
      notice: 'Supabase configurado, mas ainda sem usuário autenticado ou empresa vinculada. Mantendo dados locais por segurança.'
    };
  }

  const companyId = profile.company_id;

  const contactRows = (await listContacts(companyId)) as ContactRow[];
  const opportunityRows = (await listOpportunities(companyId)) as OpportunityRow[];
  const stageRows = await listPipelineStages(companyId);
  const taskRows = (await listTasks(companyId)) as TaskRow[];
  const messageRows = (await listQuickMessages(companyId)) as QuickMessageRow[];

  const leads = contactRows.map((contact, index) => mapContactRowToLead(contact, index));
  const leadIdByContactId = new Map<string, number>(
    contactRows.map((contact, index) => [contact.id, leads[index]?.id || index + 1])
  );
  const leadNameByContactId = new Map<string, string>(
    contactRows.map((contact) => [contact.id, contact.name])
  );
  const stageNameById = new Map<string, string>(
    stageRows.map((stage) => [stage.id, stage.name])
  );

  const deals = opportunityRows.map((opportunity, index) => {
    const stageName = opportunity.stage_id ? stageNameById.get(opportunity.stage_id) : undefined;
    return mapOpportunityRowToOpportunity(
      { ...opportunity, pipeline_stages: { name: stageName || null } },
      leadIdByContactId.get(opportunity.contact_id) || index + 1,
      index
    );
  });

  const tasks = taskRows.map((task, index) => ({
    ...mapTaskRowToTask(task, task.contact_id ? leadIdByContactId.get(task.contact_id) || index + 1 : index + 1, index),
    leadName: task.contact_id ? leadNameByContactId.get(task.contact_id) || 'Lead não identificado' : 'Sem lead vinculado'
  }));

  const messages = messageRows.map((message, index) => mapQuickMessageRowToQuickMessage(message, index));

  return {
    leads,
    deals,
    tasks,
    messages,
    notice: 'Dados reais carregados do Supabase.'
  };
}
