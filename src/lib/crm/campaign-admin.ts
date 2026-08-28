import { getFreshAccessToken } from '@/lib/supabase/client';

export type MessageCampaign = {
  id:string;company_id:string;name:string;segment_type:string;channel:string;message:string;status:string;
  total_recipients:number;created_at:string;scheduled_at?:string|null;executed_at?:string|null;
  sent_count?:number;failed_count?:number;queued_count?:number;
};
export type CampaignForm={name:string;segment_type:string;message:string;scheduled_at:string};

async function getSessionHeader(){return{Authorization:`Bearer ${await getFreshAccessToken()}`}}

export async function loadCampaigns(){
  const response=await fetch('/api/campaigns',{headers:await getSessionHeader()});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível carregar disparos.');
  return(result.campaigns||[]) as MessageCampaign[];
}
export async function createCampaign(form:CampaignForm){
  const payload={...form,scheduled_at:form.scheduled_at?new Date(form.scheduled_at).toISOString():null};
  const response=await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json',...(await getSessionHeader())},body:JSON.stringify(payload)});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível preparar disparo.');
  return result.campaign as MessageCampaign;
}
export async function processCampaign(campaignId:string){
  const response=await fetch('/api/campaigns/process',{method:'POST',headers:{'Content-Type':'application/json',...(await getSessionHeader())},body:JSON.stringify({campaignId,limit:20})});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Não foi possível processar a fila.');
  return result as {ok:boolean;sent:number;failed:number;queued:number;status:string};
}
