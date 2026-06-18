import { getCurrentProfile, listContacts, listOpportunities, listQuickMessages, listTasks } from '@/lib/supabase/crm-repository';
import { mapContactRowToLead, mapOpportunityRowToOpportunity, mapQuickMessageRowToQuickMessage, mapTaskRowToTask } from '@/lib/crm/supabase-mappers';
import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

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
  const [contactRows, opportunityRows, taskRows, messageRows] = await Promise.all([
    listContacts(companyId),
    listOpportunities(companyId),
    listTasks(companyId),
    listQuickMessages(companyId)
  ]);

  const leads = contactRows.map(mapContactRowToLead);
  const leadIdByContactId = new Map(contactRows.map((contact, index) => [contact.id, leads[index]?.id || index + 1]));

  const deals = opportunityRows.map((opportunity, index) =>
    mapOpportunityRowToOpportunity(opportunity, leadIdByContactId.get(opportunity.contact_id) || index + 1, index)
  );

  const tasks = taskRows.map((task, index) =>
    mapTaskRowToTask(task, task.contact_id ? leadIdByContactId.get(task.contact_id) || index + 1 : index + 1, index)
  );

  const messages = messageRows.map(mapQuickMessageRowToQuickMessage);

  return {
    leads,
    deals,
    tasks,
    messages,
    notice: 'Dados reais carregados do Supabase.'
  };
}
