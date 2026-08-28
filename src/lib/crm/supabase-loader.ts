import { getCurrentProfile, listActivityLogs, listContacts, listOpportunities, listPipelineStages, listQuickMessages, listTasks } from '@/lib/supabase/crm-repository';
import { mapContactRowToLead, mapOpportunityRowToOpportunity, mapQuickMessageRowToQuickMessage, mapTaskRowToTask } from '@/lib/crm/supabase-mappers';
import type { Database } from '@/lib/supabase/database.types';
import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

type ContactRow=Database['public']['Tables']['contacts']['Row'];
type OpportunityRow=Database['public']['Tables']['opportunities']['Row']&{pipeline_stages?:{name?:string|null}|null};
type TaskRow=Database['public']['Tables']['tasks']['Row'];
type QuickMessageRow=Database['public']['Tables']['quick_messages']['Row'];
type ActivityRow=Database['public']['Tables']['activity_logs']['Row'];
type CrmSnapshot={leads:Lead[];deals:Opportunity[];tasks:Task[];messages:QuickMessage[];notice:string};

function formatActivity(activity:ActivityRow){
  const date=new Date(activity.created_at);
  const formatted=Number.isNaN(date.getTime())?activity.created_at:date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
  return `${formatted} — ${activity.description}`;
}

export async function loadCrmSnapshotFromSupabase():Promise<CrmSnapshot|null>{
  const profile=await getCurrentProfile();
  if(!profile?.company_id)return null;
  const companyId=profile.company_id;

  const [contactRows,opportunityRows,stageRows,taskRows,messageRows,activityRows]=await Promise.all([
    listContacts(companyId) as Promise<ContactRow[]>,
    listOpportunities(companyId) as Promise<OpportunityRow[]>,
    listPipelineStages(companyId),
    listTasks(companyId) as Promise<TaskRow[]>,
    listQuickMessages(companyId) as Promise<QuickMessageRow[]>,
    listActivityLogs(companyId)
  ]);

  const historyByContactId=new Map<string,string[]>();
  activityRows.forEach((activity)=>{if(!activity.contact_id)return;const current=historyByContactId.get(activity.contact_id)||[];historyByContactId.set(activity.contact_id,[...current,formatActivity(activity)])});

  const leads=contactRows.map((contact,index)=>{const lead=mapContactRowToLead(contact,index);return{...lead,history:[...(historyByContactId.get(contact.id)||[]),...lead.history]}});
  const leadIdByContactId=new Map<string,number>(contactRows.map((contact,index)=>[contact.id,leads[index]?.id||index+1]));
  const leadNameByContactId=new Map<string,string>(contactRows.map((contact)=>[contact.id,contact.name]));
  const stageNameById=new Map<string,string>(stageRows.map((stage)=>[stage.id,stage.name]));

  const deals=opportunityRows.map((opportunity,index)=>{
    const stageName=opportunity.stage_name||(opportunity.stage_id?stageNameById.get(opportunity.stage_id):undefined);
    return mapOpportunityRowToOpportunity({...opportunity,pipeline_stages:{name:stageName||null}},leadIdByContactId.get(opportunity.contact_id)||index+1,index);
  });

  const tasks=taskRows.map((task,index)=>{
    const leadName=task.contact_id?leadNameByContactId.get(task.contact_id)||'Contato não identificado':'Sem contato vinculado';
    return{...mapTaskRowToTask(task,task.contact_id?leadIdByContactId.get(task.contact_id)||index+1:0,index),leadName,owner:'Equipe'};
  });
  const messages=messageRows.map((message,index)=>mapQuickMessageRowToQuickMessage(message,index));

  return{leads,deals,tasks,messages,notice:'Dados reais sincronizados com o Supabase.'};
}
