import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

const allowedStatuses = ['Aberta', 'Em atendimento', 'Resolvida', 'Arquivada'];
const allowedPriorities = ['Baixa', 'Normal', 'Alta', 'Urgente'];

type UpdatePayload = {
  conversationId?: string;
  status?: string;
  assignedTo?: string | null;
  priority?: string;
};

function canManageAtendimento(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Atendente';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!context.profile.company_id) {
    return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  }

  if (!canManageAtendimento(context.profile.role)) {
    return Response.json({ ok: false, error: 'Perfil sem permissão para atualizar atendimento.' }, { status: 403 });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.conversationId) {
    return Response.json({ ok: false, error: 'Conversa é obrigatória.' }, { status: 400 });
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    return Response.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  if (payload.priority && !allowedPriorities.includes(payload.priority)) {
    return Response.json({ ok: false, error: 'Prioridade inválida.' }, { status: 400 });
  }

  const { data: currentConversation, error: currentError } = await context.service
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', context.profile.company_id)
    .eq('id', payload.conversationId)
    .single();

  if (currentError || !currentConversation) {
    return Response.json({ ok: false, error: 'Conversa não encontrada.' }, { status: 404 });
  }

  if (payload.assignedTo) {
    const { data: assignee, error: assigneeError } = await context.service
      .from('profiles')
      .select('id, company_id, status')
      .eq('id', payload.assignedTo)
      .single();

    if (assigneeError || !assignee || assignee.company_id !== context.profile.company_id || assignee.status !== 'active') {
      return Response.json({ ok: false, error: 'Responsável inválido para esta empresa.' }, { status: 400 });
    }
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, string | null> = { updated_at: now };
  if (payload.status) {
    updatePayload.status = payload.status;
    if (payload.status === 'Resolvida') updatePayload.resolved_at = now;
    if (payload.status === 'Arquivada') updatePayload.archived_at = now;
  }
  if (payload.assignedTo !== undefined) updatePayload.assigned_to = payload.assignedTo;
  if (payload.priority) updatePayload.priority = payload.priority;

  const { data: conversation, error: updateError } = await context.service
    .from('whatsapp_conversations')
    .update(updatePayload)
    .eq('company_id', context.profile.company_id)
    .eq('id', payload.conversationId)
    .select('*')
    .single();

  if (updateError) {
    console.error('Falha ao atualizar atendimento.', updateError);
    return Response.json({ ok: false, error: 'Não foi possível atualizar o atendimento.' }, { status: 500 });
  }

  await context.service.from('atendimento_audit_logs').insert({
    company_id: context.profile.company_id,
    conversation_id: payload.conversationId,
    actor_profile_id: context.profile.id,
    action: 'conversation_updated',
    previous_value: currentConversation,
    next_value: conversation
  });

  return Response.json({ ok: true, conversation });
}
