import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

export type PublicOpsData = {
  territories:any[]; electorate:any[]; contacts:any[]; leaders:any[]; requests:any[]; events:any[];
  agenda:any[]; assets:any[]; notices:any[]; simulations:any[]; audit:any[]; whatsappAccount:any|null;
};

async function context(){
  const profile=await getCurrentProfile();
  if(!profile?.company_id)throw new Error('Usuário sem empresa vinculada.');
  const supabase=createSupabaseBrowserClient() as any;
  if(!supabase)throw new Error('Supabase indisponível.');
  return {supabase,companyId:profile.company_id};
}

export async function loadPublicOps():Promise<PublicOpsData>{
  const {supabase,companyId}=await context();
  const queries=[
    supabase.from('public_territories').select('*').eq('company_id',companyId).order('electorate_total',{ascending:false}),
    supabase.from('public_electorate_stats').select('*').eq('company_id',companyId).order('electorate_total',{ascending:false}),
    supabase.from('public_contacts').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(500),
    supabase.from('public_leaders').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(200),
    supabase.from('public_requests').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(300),
    supabase.from('public_events').select('*').eq('company_id',companyId).order('starts_at',{ascending:true}).limit(200),
    supabase.from('public_agenda').select('*').eq('company_id',companyId).order('starts_at',{ascending:true}).limit(200),
    supabase.from('public_assets').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(200),
    supabase.from('public_notices').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(200),
    supabase.from('public_simulations').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100),
    supabase.from('public_ops_audit_logs').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(100),
    supabase.from('whatsapp_accounts').select('id,status,display_phone_number').eq('company_id',companyId).maybeSingle()
  ];
  const r=await Promise.all(queries);
  for(const item of r)if(item.error)throw item.error;
  return {territories:r[0].data||[],electorate:r[1].data||[],contacts:r[2].data||[],leaders:r[3].data||[],requests:r[4].data||[],events:r[5].data||[],agenda:r[6].data||[],assets:r[7].data||[],notices:r[8].data||[],simulations:r[9].data||[],audit:r[10].data||[],whatsappAccount:r[11].data||null};
}

export async function insertPublic(table:string,payload:Record<string,unknown>){
  const {supabase,companyId}=await context();
  const {data,error}=await supabase.from(table).insert({company_id:companyId,...payload}).select('*').single();
  if(error)throw error;return data;
}

export async function updatePublic(table:string,id:string,payload:Record<string,unknown>){
  const {supabase,companyId}=await context();
  const {data,error}=await supabase.from(table).update(payload).eq('company_id',companyId).eq('id',id).select('*').single();
  if(error)throw error;return data;
}

export async function sendPublicInformation(input:{contactId:string;purpose:'servico'|'evento'|'informacao_publica';text:string}){
  const supabase=createSupabaseBrowserClient() as any;
  const {data}=await supabase.auth.getSession();
  const token=data.session?.access_token;
  if(!token)throw new Error('Sessão expirada.');
  const response=await fetch('/api/public/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(input)});
  const result=await response.json();
  if(!response.ok||!result.ok)throw new Error(result.error||'Falha no envio.');
  return result;
}
