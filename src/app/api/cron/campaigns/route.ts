import { createSupabaseServiceClient } from '@/lib/supabase/server';

function normalizePhone(value?:string|null){return(value||'').replace(/\D/g,'')}

async function sendCloud(to:string,text:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version=process.env.WHATSAPP_GRAPH_API_VERSION||'v20.0';
  if(!token||!phoneId)return{ok:false,id:null,error:'WhatsApp Cloud API não configurada'};
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body:text}})
  });
  const data=await response.json().catch(()=>null);
  return{ok:response.ok,id:response.ok?data?.messages?.[0]?.id||null:null,error:response.ok?null:data?.error?.message||'Falha no provedor'};
}

async function processCampaign(service:any,campaign:any){
  const {data:recipients}=await service.from('message_campaign_recipients').select('*')
    .eq('company_id',campaign.company_id).eq('campaign_id',campaign.id).eq('status','queued').limit(50);

  let sent=0,failed=0;
  for(const recipient of recipients||[]){
    const phone=normalizePhone(recipient.phone);
    if(!phone){failed++;await service.from('message_campaign_recipients').update({status:'failed',error_message:'Telefone inválido'}).eq('id',recipient.id);continue;}

    const result=await sendCloud(phone,campaign.message);
    const now=new Date().toISOString();
    if(!result.ok){
      failed++;
      await service.from('message_campaign_recipients').update({status:'failed',error_message:String(result.error||'Falha no envio')}).eq('id',recipient.id);
      continue;
    }

    sent++;
    await service.from('message_campaign_recipients').update({status:'sent',provider_message_id:result.id,sent_at:now,error_message:null}).eq('id',recipient.id);

    let {data:conversation}=await service.from('whatsapp_conversations').select('*')
      .eq('company_id',campaign.company_id).eq('customer_phone',phone).order('updated_at',{ascending:false}).limit(1).maybeSingle();
    if(!conversation){
      const created=await service.from('whatsapp_conversations').insert({
        company_id:campaign.company_id,contact_id:recipient.contact_id||null,customer_phone:phone,customer_name:recipient.name||null,
        status:'Em atendimento',priority:'Normal',channel:'WhatsApp',last_message_at:now
      }).select('*').single();
      conversation=created.data;
    }
    if(conversation){
      await service.from('whatsapp_messages').insert({
        company_id:campaign.company_id,conversation_id:conversation.id,contact_id:recipient.contact_id||conversation.contact_id||null,
        direction:'outbound',provider_message_id:result.id,from_phone:process.env.WHATSAPP_PHONE_NUMBER_ID||null,to_phone:phone,
        message_type:'text',body:campaign.message,status:'sent',raw_payload:{source:'scheduled_campaign',campaign_id:campaign.id},created_at:now
      });
      await service.from('whatsapp_conversations').update({last_message_at:now,status:'Em atendimento',updated_at:now}).eq('id',conversation.id);
    }
  }

  const {count:queued}=await service.from('message_campaign_recipients').select('id',{count:'exact',head:true})
    .eq('company_id',campaign.company_id).eq('campaign_id',campaign.id).eq('status','queued');

  const remaining=Number(queued||0);
  const nextStatus=remaining>0?'scheduled':'completed';
  await service.from('message_campaigns').update({
    status:nextStatus,
    executed_at:remaining>0?campaign.executed_at||new Date().toISOString():new Date().toISOString(),
    sent_count:Number(campaign.sent_count||0)+sent,
    failed_count:Number(campaign.failed_count||0)+failed,
    queued_count:remaining,
    updated_at:new Date().toISOString()
  }).eq('id',campaign.id).eq('company_id',campaign.company_id);

  await service.from('atendimento_audit_logs').insert({
    company_id:campaign.company_id,action:'scheduled_campaign_processed',
    next_value:{campaign:campaign.name,campaignId:campaign.id,sent,failed,queued:remaining}
  });

  return{sent,failed,queued:remaining};
}

export async function POST(request:Request){
  const service=createSupabaseServiceClient();
  if(!service)return Response.json({ok:false,error:'Supabase service indisponível.'},{status:500});

  const received=request.headers.get('x-clack-cron-secret')||'';
  const {data:setting}=await service.from('system_internal_settings').select('secret').eq('key','campaign_cron_secret').maybeSingle();
  if(!setting?.secret||received!==setting.secret)return Response.json({ok:false,error:'Não autorizado.'},{status:401});

  const now=new Date().toISOString();
  const {data:campaigns,error}=await service.from('message_campaigns').select('*')
    .eq('status','scheduled').lte('scheduled_at',now).order('scheduled_at',{ascending:true}).limit(6);
  if(error)return Response.json({ok:false,error:error.message},{status:500});

  let sent=0,failed=0;
  for(const campaign of campaigns||[]){
    const result=await processCampaign(service,campaign);
    sent+=result.sent;failed+=result.failed;
  }

  await service.from('system_job_heartbeat').upsert({
    job_name:'campaign-engine',last_run_at:new Date().toISOString(),status:'ok',
    details:{campaigns:(campaigns||[]).length,sent,failed}
  });

  return Response.json({ok:true,campaigns:(campaigns||[]).length,sent,failed});
}

export async function GET(){return Response.json({ok:true,service:'CLACK scheduled campaign engine'});}
