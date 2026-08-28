import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type Payload={campaignId?:string;limit?:number};
function canManage(role:string){const r=normalizeRole(role);return r==='Admin Empresa'||r==='Gestor'}
function normalizePhone(value?:string|null){return(value||'').replace(/\D/g,'')}

async function sendCloud(to:string,text:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version=process.env.WHATSAPP_GRAPH_API_VERSION||'v20.0';
  if(!token||!phoneId)throw new Error('WhatsApp Cloud API não está configurada no ambiente de produção.');
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{
    method:'POST',
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body:text}})
  });
  const data=await response.json().catch(()=>null);
  return {ok:response.ok,id:response.ok?data?.messages?.[0]?.id||null:null,error:response.ok?null:data};
}

export async function POST(request:Request){
  const {context,error}=await getAdminRequestContext(request);if(error)return error;
  if(!context?.profile.company_id)return Response.json({ok:false,error:'Empresa não encontrada.'},{status:400});
  if(!canManage(context.profile.role))return Response.json({ok:false,error:'Perfil sem permissão para executar disparos.'},{status:403});

  let payload:Payload;try{payload=await request.json()}catch{return Response.json({ok:false,error:'Payload inválido.'},{status:400})}
  if(!payload.campaignId)return Response.json({ok:false,error:'Campanha não informada.'},{status:400});

  const companyId=context.profile.company_id;
  const {data:campaign,error:campaignError}=await context.service.from('message_campaigns').select('*').eq('company_id',companyId).eq('id',payload.campaignId).single();
  if(campaignError||!campaign)return Response.json({ok:false,error:'Campanha não encontrada.'},{status:404});

  const limit=Math.max(1,Math.min(Number(payload.limit||20),50));
  const {data:recipients,error:recError}=await context.service.from('message_campaign_recipients').select('*').eq('company_id',companyId).eq('campaign_id',campaign.id).eq('status','queued').limit(limit);
  if(recError)return Response.json({ok:false,error:recError.message},{status:500});

  let sent=0,failed=0;
  for(const recipient of recipients||[]){
    const phone=normalizePhone(recipient.phone);
    if(!phone){failed++;await context.service.from('message_campaign_recipients').update({status:'failed',error_message:'Telefone inválido'}).eq('id',recipient.id);continue;}

    try{
      const result=await sendCloud(phone,campaign.message);
      const now=new Date().toISOString();
      if(!result.ok){
        failed++;
        await context.service.from('message_campaign_recipients').update({status:'failed',error_message:JSON.stringify(result.error||{})}).eq('id',recipient.id);
        continue;
      }

      sent++;
      await context.service.from('message_campaign_recipients').update({status:'sent',provider_message_id:result.id,sent_at:now,error_message:null}).eq('id',recipient.id);

      let {data:conversation}=await context.service.from('whatsapp_conversations').select('*').eq('company_id',companyId).eq('customer_phone',phone).order('updated_at',{ascending:false}).limit(1).maybeSingle();
      if(!conversation){
        const created=await context.service.from('whatsapp_conversations').insert({company_id:companyId,contact_id:recipient.contact_id||null,customer_phone:phone,customer_name:recipient.name||null,status:'Em atendimento',priority:'Normal',channel:'WhatsApp',assigned_to:context.profile.id,last_message_at:now}).select('*').single();
        conversation=created.data;
      }

      if(conversation){
        await context.service.from('whatsapp_messages').insert({company_id:companyId,conversation_id:conversation.id,contact_id:recipient.contact_id||conversation.contact_id||null,user_id:context.profile.id,direction:'outbound',provider_message_id:result.id,from_phone:process.env.WHATSAPP_PHONE_NUMBER_ID||null,to_phone:phone,message_type:'text',body:campaign.message,status:'sent',raw_payload:{source:'campaign',campaign_id:campaign.id},created_at:now});
        await context.service.from('whatsapp_conversations').update({last_message_at:now,status:'Em atendimento',assigned_to:context.profile.id,updated_at:now}).eq('id',conversation.id);
      }
    }catch(sendError){
      failed++;
      await context.service.from('message_campaign_recipients').update({status:'failed',error_message:sendError instanceof Error?sendError.message:'Falha no envio'}).eq('id',recipient.id);
    }
  }

  const {count:queued}=await context.service.from('message_campaign_recipients').select('id',{count:'exact',head:true}).eq('company_id',companyId).eq('campaign_id',campaign.id).eq('status','queued');
  const status=Number(queued||0)>0?'sending':'completed';
  await context.service.from('message_campaigns').update({
    status,
    executed_at:new Date().toISOString(),
    sent_count:Number(campaign.sent_count||0)+sent,
    failed_count:Number(campaign.failed_count||0)+failed,
    queued_count:Number(queued||0),
    updated_at:new Date().toISOString()
  }).eq('id',campaign.id).eq('company_id',companyId);

  await context.service.from('atendimento_audit_logs').insert({company_id:companyId,actor_profile_id:context.profile.id,action:'campaign_processed',next_value:{campaign:campaign.name,sent,failed,queued:Number(queued||0)}});

  return Response.json({ok:true,sent,failed,queued:Number(queued||0),status});
}
