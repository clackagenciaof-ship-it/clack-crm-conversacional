import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

const purposes=['servico','evento','informacao_publica'];
const audiences=['all_consented','city','state'];
const frequencies=['once','daily','weekly'];
function canManage(role:string){return ['Admin Empresa','Gestor'].includes(normalizeRole(role));}

export async function GET(request:Request){
  const {context,error}=await getAdminRequestContext(request);if(error)return error;
  if(!context?.profile.company_id)return Response.json({ok:false,error:'Empresa não encontrada.'},{status:400});
  const companyId=context.profile.company_id;
  const [automations,runs]=await Promise.all([
    context.service.from('public_message_automations').select('*').eq('company_id',companyId).order('created_at',{ascending:false}),
    context.service.from('public_message_automation_runs').select('*').eq('company_id',companyId).order('created_at',{ascending:false}).limit(30)
  ]);
  if(automations.error)return Response.json({ok:false,error:automations.error.message},{status:500});
  return Response.json({ok:true,automations:automations.data||[],runs:runs.data||[]});
}

export async function POST(request:Request){
  const {context,error}=await getAdminRequestContext(request);if(error)return error;
  if(!context?.profile.company_id)return Response.json({ok:false,error:'Empresa não encontrada.'},{status:400});
  if(!canManage(context.profile.role))return Response.json({ok:false,error:'Perfil sem permissão para automações públicas.'},{status:403});
  let payload:any;try{payload=await request.json()}catch{return Response.json({ok:false,error:'Payload inválido.'},{status:400})}

  if(payload.id && typeof payload.active==='boolean' && !payload.name){
    const {data,error:updateError}=await context.service.from('public_message_automations')
      .update({active:payload.active,updated_at:new Date().toISOString()})
      .eq('company_id',context.profile.company_id).eq('id',payload.id).select('*').single();
    if(updateError)return Response.json({ok:false,error:updateError.message},{status:500});
    return Response.json({ok:true,automation:data});
  }

  const name=String(payload.name||'').trim(),message=String(payload.message||'').trim();
  if(!name||!message)return Response.json({ok:false,error:'Nome e mensagem são obrigatórios.'},{status:400});
  if(!purposes.includes(payload.purpose))return Response.json({ok:false,error:'Finalidade inválida.'},{status:400});
  if(!audiences.includes(payload.audience_type))return Response.json({ok:false,error:'Público inválido.'},{status:400});
  if(!frequencies.includes(payload.frequency))return Response.json({ok:false,error:'Frequência inválida.'},{status:400});
  if(payload.audience_type==='city'&&!String(payload.city||'').trim())return Response.json({ok:false,error:'Informe a cidade.'},{status:400});
  if(payload.audience_type==='state'&&!String(payload.state||'').trim())return Response.json({ok:false,error:'Informe a UF.'},{status:400});

  const row={
    company_id:context.profile.company_id,
    name,
    purpose:payload.purpose,
    audience_type:payload.audience_type,
    city:payload.audience_type==='city'?String(payload.city||'').trim():null,
    state:payload.audience_type==='state'?String(payload.state||'').trim().toUpperCase():payload.audience_type==='city'&&payload.state?String(payload.state).trim().toUpperCase():null,
    message,
    frequency:payload.frequency,
    next_run_at:payload.next_run_at||new Date().toISOString(),
    active:payload.active!==false,
    created_by:context.profile.id,
    updated_at:new Date().toISOString()
  };

  const query=payload.id
    ? context.service.from('public_message_automations').update(row).eq('company_id',context.profile.company_id).eq('id',payload.id)
    : context.service.from('public_message_automations').insert(row);
  const {data,error:saveError}=await query.select('*').single();
  if(saveError)return Response.json({ok:false,error:saveError.message},{status:500});

  await context.service.from('public_ops_audit_logs').insert({
    company_id:context.profile.company_id,actor_profile_id:context.profile.id,
    entity_type:'public_message_automations',entity_id:data.id,action:payload.id?'automation_updated':'automation_created',
    metadata:{purpose:data.purpose,audience_type:data.audience_type,frequency:data.frequency}
  });
  return Response.json({ok:true,automation:data});
}
