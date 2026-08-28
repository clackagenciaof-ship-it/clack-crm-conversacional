import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

const allowedPurposes=['servico','evento','informacao_publica'] as const;
function normalizePhone(value?:string|null){return(value||'').replace(/\D/g,'')}
function canSend(role:string){return ['Admin Empresa','Gestor','Atendente'].includes(normalizeRole(role));}

async function cloudSend(to:string,text:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId=process.env.WHATSAPP_PHONE_NUMBER_ID;
  const version=process.env.WHATSAPP_GRAPH_API_VERSION||'v20.0';
  if(!token||!phoneId)return{sent:false,status:'queued',providerMessageId:null};
  const response=await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to,type:'text',text:{preview_url:false,body:text}})});
  const data=await response.json().catch(()=>null);
  if(!response.ok)return{sent:false,status:'failed',providerMessageId:null};
  return{sent:true,status:'sent',providerMessageId:data?.messages?.[0]?.id||null};
}

export async function POST(request:Request){
  const {context,error}=await getAdminRequestContext(request);if(error)return error;
  if(!context?.profile.company_id)return Response.json({ok:false,error:'Empresa não encontrada.'},{status:400});
  if(!canSend(context.profile.role))return Response.json({ok:false,error:'Perfil sem permissão para esta comunicação.'},{status:403});
  let payload:any;try{payload=await request.json()}catch{return Response.json({ok:false,error:'Payload inválido.'},{status:400})}
  if(!allowedPurposes.includes(payload.purpose))return Response.json({ok:false,error:'Finalidade não permitida.'},{status:400});
  const text=String(payload.text||'').trim();if(!text)return Response.json({ok:false,error:'Mensagem obrigatória.'},{status:400});

  const companyId=context.profile.company_id;
  const {data:contact,error:contactError}=await context.service.from('public_contacts').select('id,name,phone,consent_status').eq('company_id',companyId).eq('id',payload.contactId).single();
  if(contactError||!contact)return Response.json({ok:false,error:'Contato não encontrado.'},{status:404});
  if(!contact.consent_status)return Response.json({ok:false,error:'Contato sem consentimento registrado para comunicação.'},{status:400});
  const phone=normalizePhone(contact.phone);if(!phone)return Response.json({ok:false,error:'Contato sem WhatsApp válido.'},{status:400});

  let {data:conversation}=await context.service.from('whatsapp_conversations').select('*').eq('company_id',companyId).eq('customer_phone',phone).maybeSingle();
  if(!conversation){
    const created=await context.service.from('whatsapp_conversations').insert({company_id:companyId,customer_phone:phone,customer_name:contact.name,status:'Em atendimento',priority:'Normal',channel:'WhatsApp',assigned_to:context.profile.id,last_message_at:new Date().toISOString()}).select('*').single();
    if(created.error)return Response.json({ok:false,error:created.error.message},{status:500});
    conversation=created.data;
  }

  const sent=await cloudSend(phone,text);
  const now=new Date().toISOString();
  const saved=await context.service.from('whatsapp_messages').insert({company_id:companyId,conversation_id:conversation.id,contact_id:null,user_id:context.profile.id,direction:'outbound',provider_message_id:sent.providerMessageId,from_phone:process.env.WHATSAPP_PHONE_NUMBER_ID||null,to_phone:phone,message_type:'text',body:text,status:sent.status,raw_payload:{source:'public_360',purpose:payload.purpose,sent:sent.sent},created_at:now}).select('*').single();
  if(saved.error)return Response.json({ok:false,error:saved.error.message},{status:500});

  await context.service.from('public_ops_audit_logs').insert({company_id:companyId,actor_profile_id:context.profile.id,entity_type:'public_contacts',entity_id:contact.id,action:'information_sent',metadata:{purpose:payload.purpose,channel:'WhatsApp',status:sent.status}});
  await context.service.from('whatsapp_conversations').update({last_message_at:now,status:'Em atendimento',assigned_to:context.profile.id}).eq('id',conversation.id);

  return Response.json({ok:true,sent:sent.sent,status:sent.status});
}
