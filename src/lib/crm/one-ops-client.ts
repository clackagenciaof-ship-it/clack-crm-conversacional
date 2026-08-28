import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

export type OneOpsSnapshot = {
  companyName: string;
  contacts: number;
  openConversations: number;
  unassignedConversations: number;
  resolvedConversations: number;
  pendingTasks: number;
  overdueTasks: number;
  activeAutomations: number;
  automationRuns: number;
  activeFlows: number;
  activeProducts: number;
  pendingInvoices: number;
  sources: Array<{name:string;count:number}>;
  integration: {
    runtime: boolean;
    supabase: boolean;
    whatsappAccount: boolean;
    whatsappProvider: boolean;
    whatsappNumber?: string | null;
    webhook: boolean;
    automation: boolean;
    ai: boolean;
  };
};

async function accessToken() {
  const supabase = createSupabaseBrowserClient() as any;
  const { data } = await supabase?.auth.getSession();
  return data?.session?.access_token || null;
}

export async function loadOneOpsSnapshot(): Promise<OneOpsSnapshot> {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada.');
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase indisponível.');
  const companyId = profile.company_id;

  const [company, contacts, conversations, tasks, rules, runs, flows, products, invoices] = await Promise.all([
    supabase.from('companies').select('name').eq('id',companyId).maybeSingle(),
    supabase.from('contacts').select('id,origin').eq('company_id',companyId),
    supabase.from('whatsapp_conversations').select('id,status,assigned_to').eq('company_id',companyId),
    supabase.from('tasks').select('id,status,due_at').eq('company_id',companyId),
    supabase.from('automation_rules').select('id,active').eq('company_id',companyId),
    supabase.from('automation_runs').select('id,status').eq('company_id',companyId).limit(500),
    supabase.from('chatbot_flows').select('id,active').eq('company_id',companyId),
    supabase.from('product_services').select('id,status').eq('company_id',companyId),
    supabase.from('finance_invoices').select('id,status').eq('company_id',companyId)
  ]);

  for (const result of [company,contacts,conversations,tasks,rules,runs,flows,products,invoices]) {
    if (result.error) throw result.error;
  }

  const now=Date.now();
  const sourceMap: Record<string, number> = (contacts.data || []).reduce((acc: Record<string, number>, row: any) => { const key = row.origin || 'Não informado'; acc[key] = (acc[key] || 0) + 1; return acc; }, {} as Record<string, number>);
  const token=await accessToken();
  let health:any=null;
  if(token){
    try{
      const response=await fetch('/api/health/operations',{headers:{Authorization:`Bearer ${token}`}});
      if(response.ok) health=await response.json();
    }catch{}
  }

  const conv=conversations.data||[];
  const taskRows=tasks.data||[];
  return {
    companyName: company.data?.name || 'Empresa',
    contacts:(contacts.data||[]).length,
    openConversations:conv.filter((row:any)=>['Aberta','Em atendimento'].includes(row.status)).length,
    unassignedConversations:conv.filter((row:any)=>row.status==='Aberta'&&!row.assigned_to).length,
    resolvedConversations:conv.filter((row:any)=>row.status==='Resolvida').length,
    pendingTasks:taskRows.filter((row:any)=>!['Concluída','Cancelada'].includes(row.status)).length,
    overdueTasks:taskRows.filter((row:any)=>row.due_at&&new Date(row.due_at).getTime()<now&&!['Concluída','Cancelada'].includes(row.status)).length,
    activeAutomations:(rules.data||[]).filter((row:any)=>row.active).length,
    automationRuns:(runs.data||[]).length,
    activeFlows:(flows.data||[]).filter((row:any)=>row.active).length,
    activeProducts:(products.data||[]).filter((row:any)=>row.status==='Ativo').length,
    pendingInvoices:(invoices.data||[]).filter((row:any)=>row.status!=='Pago').length,
    sources:Object.entries(sourceMap).map(([name,count])=>({name,count:Number(count)})).sort((a,b)=>b.count-a.count),
    integration:{
      runtime:health?.runtime==='online',
      supabase:health?.supabase===true,
      whatsappAccount:Boolean(health?.whatsapp?.account),
      whatsappProvider:health?.whatsapp?.providerConfigured===true,
      whatsappNumber:health?.whatsapp?.account?.display_phone_number||null,
      webhook:health?.whatsapp?.webhookConfigured===true,
      automation:(health?.automation?.activeFlows||0)+(health?.automation?.activeRules||0)>0,
      ai:health?.ai?.enabled===true
    }
  };
}
