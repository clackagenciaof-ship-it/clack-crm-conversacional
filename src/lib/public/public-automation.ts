import { getFreshAccessToken } from '@/lib/supabase/client';

export type PublicMessageAutomation = {
  id:string; company_id:string; name:string; purpose:'servico'|'evento'|'informacao_publica';
  audience_type:'all_consented'|'city'|'state'; city:string|null; state:string|null;
  message:string; frequency:'once'|'daily'|'weekly'; next_run_at:string; last_run_at:string|null;
  active:boolean; created_at:string; updated_at:string;
};

export type PublicMessageAutomationRun = {
  id:string; automation_id:string; audience_count:number; sent_count:number; failed_count:number;
  status:string; scheduled_for:string|null; created_at:string;
};

async function headers(json=false){
  const token=await getFreshAccessToken();
  return {Authorization:`Bearer ${token}`,...(json?{'Content-Type':'application/json'}:{})};
}

export async function loadPublicAutomations(){
  const response=await fetch('/api/public/automations',{headers:await headers()});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível carregar automações públicas.');
  return {automations:(result.automations||[]) as PublicMessageAutomation[],runs:(result.runs||[]) as PublicMessageAutomationRun[]};
}

export async function savePublicAutomation(payload:Partial<PublicMessageAutomation>){
  const response=await fetch('/api/public/automations',{method:'POST',headers:await headers(true),body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível salvar automação.');
  return result.automation as PublicMessageAutomation;
}

export async function togglePublicAutomation(id:string,active:boolean){
  return savePublicAutomation({id,active});
}
