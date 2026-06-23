import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type SequencePayload = {
  conversationId?: string;
  flowId?: string;
  mode?: 'start' | 'next' | 'restart';
};

type FlowStep = {
  id: string;
  flow_id: string;
  position: number;
  step_type: string;
  message: string;
  delay_minutes: number;
};

function canRunFlow(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Atendente' || normalized === 'Vendedor';
}

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

async function sendToWhatsAppCloud(toPhone: string, text: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';

  if (!accessToken || !phoneNumberId) return { sent: false, providerMessageId: null, status: 'queued' };

  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { preview_url: false, body: text } })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    console.error('Falha ao enviar etapa do fluxo para WhatsApp.', data);
    return { sent: false, providerMessageId: null, status: 'failed' };
  }
  return { sent: true, providerMessageId: data?.messages?.[0]?.id || null, status: 'sent' };
}

async function createOutboundMessage(context: any, conversation: any, step: FlowStep) {
  const toPhone = normalizePhone(conversation.customer_phone);
  const sendResult = await sendToWhatsAppCloud(toPhone, step.message);
  const now = new Date().toISOString();

  const { error } = await context.service.from('whatsapp_messages').insert({
    company_id: context.profile.company_id,
    conversation_id: conversation.id,
    contact_id: conversation.contact_id || null,
    user_id: context.profile.id,
    direction: 'outbound',
    provider_message_id: sendResult.providerMessageId,
    from_phone: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
    to_phone: toPhone,
    message_type: 'text',
    body: step.message,
    status: sendResult.status,
    raw_payload: { source: 'chatbot_flow', flow_step_id: step.id, sent: sendResult.sent },
    created_at: now
  });

  if (error) throw error;

  await context.service.from('whatsapp_conversations').update({
    last_message_at: now,
    status: step.step_type === 'handoff' ? 'Em atendimento' : conversation.status === 'Aberta' ? 'Em atendimento' : conversation.status,
    assigned_to: context.profile.id,
    updated_at: now
  }).eq('company_id', context.profile.company_id).eq('id', conversation.id);

  return sendResult.sent ? 'Mensagem enviada pela API Meta.' : 'Mensagem registrada na fila do CRM.';
}

async function createTaskFromStep(context: any, conversation: any, step: FlowStep) {
  const dueAt = new Date(Date.now() + Math.max(0, step.delay_minutes || 0) * 60000).toISOString();
  const { error } = await context.service.from('tasks').insert({
    company_id: context.profile.company_id,
    contact_id: conversation.contact_id || null,
    owner_id: context.profile.id,
    title: `Fluxo automático: ${conversation.customer_name || conversation.customer_phone}`,
    description: step.message,
    type: 'Automação',
    priority: 'Média',
    status: 'Pendente',
    due_at: dueAt
  });
  if (error) throw error;
  return 'Tarefa criada pelo fluxo.';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canRunFlow(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para executar fluxo.' }, { status: 403 });

  let payload: SequencePayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }
  if (!payload.conversationId) return Response.json({ ok: false, error: 'Conversa não informada.' }, { status: 400 });

  const companyId = context.profile.company_id;
  const mode = payload.mode || 'next';

  const { data: conversation, error: conversationError } = await context.service
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', payload.conversationId)
    .single();

  if (conversationError || !conversation) return Response.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });

  let session: any = null;

  if (mode !== 'restart') {
    const { data: existing } = await context.service
      .from('chatbot_flow_sessions')
      .select('*')
      .eq('company_id', companyId)
      .eq('conversation_id', conversation.id)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .limit(1);
    session = existing?.[0] || null;
  }

  const flowId = payload.flowId || session?.flow_id;
  if (!flowId) return Response.json({ ok: false, error: 'Selecione um fluxo para iniciar.' }, { status: 400 });

  const { data: flow, error: flowError } = await context.service
    .from('chatbot_flows')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', flowId)
    .single();

  if (flowError || !flow) return Response.json({ ok: false, error: 'Fluxo não encontrado para esta empresa.' }, { status: 404 });

  if (!session || mode === 'restart') {
    const { data: newSession, error: sessionError } = await context.service.from('chatbot_flow_sessions').insert({
      company_id: companyId,
      flow_id: flow.id,
      conversation_id: conversation.id,
      contact_id: conversation.contact_id || null,
      status: 'running',
      current_position: 0,
      started_by: context.profile.id
    }).select('*').single();

    if (sessionError) return Response.json({ ok: false, error: sessionError.message }, { status: 500 });
    session = newSession;
  }

  const { data: steps, error: stepsError } = await context.service
    .from('chatbot_flow_steps')
    .select('*')
    .eq('company_id', companyId)
    .eq('flow_id', flow.id)
    .order('position', { ascending: true });

  if (stepsError) return Response.json({ ok: false, error: stepsError.message }, { status: 500 });

  const nextStep = ((steps || []) as FlowStep[]).find((step) => step.position > Number(session.current_position || 0));
  if (!nextStep) {
    const now = new Date().toISOString();
    await context.service.from('chatbot_flow_sessions').update({ status: 'completed', completed_at: now, updated_at: now }).eq('id', session.id).eq('company_id', companyId);
    return Response.json({ ok: true, completed: true, message: 'Fluxo concluído. Não há próximos passos.' });
  }

  let result = 'Etapa executada.';
  try {
    if (nextStep.step_type === 'task') result = await createTaskFromStep(context, conversation, nextStep);
    else result = await createOutboundMessage(context, conversation, nextStep);
  } catch (executionError) {
    console.error('Falha ao executar etapa do fluxo.', executionError);
    return Response.json({ ok: false, error: 'Não foi possível executar a etapa do fluxo.' }, { status: 500 });
  }

  const hasNext = ((steps || []) as FlowStep[]).some((step) => step.position > nextStep.position);
  const now = new Date().toISOString();
  const nextStatus = hasNext ? 'running' : 'completed';

  await context.service.from('chatbot_flow_session_events').insert({
    company_id: companyId,
    session_id: session.id,
    flow_id: flow.id,
    step_id: nextStep.id,
    conversation_id: conversation.id,
    step_position: nextStep.position,
    action_type: nextStep.step_type,
    message: nextStep.message,
    status: 'executed',
    result
  });

  const { data: updatedSession } = await context.service.from('chatbot_flow_sessions').update({
    current_position: nextStep.position,
    last_step_at: now,
    status: nextStatus,
    completed_at: hasNext ? null : now,
    updated_at: now
  }).eq('id', session.id).eq('company_id', companyId).select('*').single();

  await context.service.from('atendimento_audit_logs').insert({
    company_id: companyId,
    conversation_id: conversation.id,
    actor_profile_id: context.profile.id,
    action: 'flow_step_executed',
    next_value: { flow: flow.name, step: nextStep.position, type: nextStep.step_type, result }
  });

  return Response.json({ ok: true, completed: !hasNext, flow, step: nextStep, session: updatedSession || session, result });
}
