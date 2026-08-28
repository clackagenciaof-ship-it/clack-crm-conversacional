import { createSupabaseServiceClient } from '@/lib/supabase/server';

function normalizePhone(value?:string|null){return(value||'').replace(/\D/g,'')}
function nextDate(frequency:string,from:Date){const d=new Date(from);if(frequency==='daily')d.setUTCDate(d.getUTCDate()+1);if(frequency==='weekly')d.setUTCDate(d.getUTCDate()+7);return d.toISOString();}

async function cloudSend(to:string,text:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version=process.env.WHATSAPP_GRAPH_API_VERSION||'v20.0';
  if(!token||!phoneId)return{sent:false,status:'failed',providerMessageId:null,error:'WhatsApp Cloud API não configurada'};
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body:text}})
  });
  const data=await response.json().catch(()=>null);
  if(!response.ok)return{sent:false,status:'failed',providerMessageId:null,error:data?.error?.message||'Falha no provedor'};
  return{sent:true,status:'sent',providerMessageId:data?.messages?.[0]?.id||null,error:null};
}

export async function POST(request:Request){
  const service=createSupabaseServiceClient();
  if(!service)return Response.json({ok:false,error:'Supabase service indisponível.'},{status:500});

  const received=request.headers.get('x-clack-cron-secret')||'';
  const {data:setting}=await service.from('system_internal_settings').select('secret').eq('key','public_message_cron_secret').maybeSingle();
  if(!setting?.secret||received!==setting.secret)return Response.json({ok:false,error:'Não autorizado.'},{status:401});

  const now=new Date();
  const {data:automations,error}=await service.from('public_message_automations').select('*')
    .eq('active',true).lte('next_run_at',now.toISOString()).order('next_run_at',{ascending:true}).limit(12);
  if(error)return Response.json({ok:false,error:error.message},{status:500});

  let jobs=0,totalSent=0,totalFailed=0;
  for(const automation of automations||[]){
    jobs++;
    let query=service.from('public_contacts').select('*').eq('company_id',automation.company_id).eq('consent_status',true).not('phone','is',null).limit(250);
    if(automation.audience_type==='city')query=query.eq('city',automation.city);
    if(automation.audience_type==='state')query=query.eq('state',automation.state);
    const {data:contacts,error:contactError}=await query;
    if(contactError)continue;

    const run=await service.from('public_message_automation_runs').insert({
      company_id:automation.company_id,automation_id:automation.id,scheduled_for:automation.next_run_at,
      audience_count:(contacts||[]).length,status:'started'
    }).select('*').single();
    let sent=0,failed=0;

    for(const contact of contacts||[]){
      const phone=normalizePhone(contact.phone);if(!phone){failed++;continue;}
      const result=await cloudSend(phone,automation.message);
      const stamp=new Date().toISOString();
      if(result.sent){
        sent++;
        let {data:conversation}=await service.from('whatsapp_conversations').select('*')
          .eq('company_id',automation.company_id).eq('customer_phone',phone).order('updated_at',{ascending:false}).limit(1).maybeSingle();
        if(!conversation){
          const created=await service.from('whatsapp_conversations').insert({
            company_id:automation.company_id,customer_phone:phone,customer_name:contact.name,
            status:'Em atendimento',priority:'Normal',channel:'WhatsApp',last_message_at:stamp
          }).select('*').single();
          conversation=created.data;
        }
        if(conversation){
          await service.from('whatsapp_messages').insert({
            company_id:automation.company_id,conversation_id:conversation.id,direction:'outbound',
            provider_message_id:result.providerMessageId,from_phone:process.env.WHATSAPP_PHONE_NUMBER_ID||null,
            to_phone:phone,message_type:'text',body:automation.message,status:'sent',
            raw_payload:{source:'public_automation',automation_id:automation.id,purpose:automation.purpose},created_at:stamp
          });
          await service.from('whatsapp_conversations').update({last_message_at:stamp,status:'Em atendimento',updated_at:stamp}).eq('id',conversation.id);
        }
        await service.from('public_ops_audit_logs').insert({
          company_id:automation.company_id,entity_type:'public_contacts',entity_id:contact.id,
          action:'automated_information_sent',metadata:{automation_id:automation.id,purpose:automation.purpose,status:'sent'}
        });
      }else failed++;
    }

    totalSent+=sent;totalFailed+=failed;
    if(run.data?.id)await service.from('public_message_automation_runs').update({
      sent_count:sent,failed_count:failed,status:failed>0&&sent===0?'failed':'completed',
      details:{frequency:automation.frequency,audience_type:automation.audience_type}
    }).eq('id',run.data.id);

    const nextActive=automation.frequency!=='once';
    await service.from('public_message_automations').update({
      last_run_at:new Date().toISOString(),
      next_run_at:nextActive?nextDate(automation.frequency,now):automation.next_run_at,
      active:nextActive,updated_at:new Date().toISOString()
    }).eq('id',automation.id);
  }

  await service.from('system_job_heartbeat').upsert({
    job_name:'public-message-engine',last_run_at:new Date().toISOString(),status:'ok',
    details:{jobs,sent:totalSent,failed:totalFailed}
  });

  return Response.json({ok:true,jobs,sent:totalSent,failed:totalFailed});
}

export async function GET(){return Response.json({ok:true,service:'CLACK public message scheduler'});}
