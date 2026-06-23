import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

const allowedStatuses = ['Aberta', 'Em atendimento', 'Resolvida', 'Arquivada'];

type StatusPayload = {
  conversationId?: string;
  status?: string;
};

function canManageAtendimento(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Atendente';
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context) return Response.json({ ok: false, error: 'Contexto inválido.' }, { status: 500 });

  if (!context.profile.company_id || !canManageAtendimento(context.profile.role)) {
    return Response.json({ ok: false, error: 'Perfil sem permissão para atualizar atendimento.' }, { status: 403 });
  }

  let payload: StatusPayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.conversationId || !payload.status) {
    return Response.json({ ok: false, error: 'Conversa e status são obrigatórios.' }, { status: 400 });
  }

  if (!allowedStatuses.includes(payload.status)) {
    return Response.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { data, error: updateError } = await context.service
    .from('whatsapp_conversations')
    .update({ status: payload.status, updated_at: now })
    .eq('company_id', context.profile.company_id)
    .eq('id', payload.conversationId)
    .select('*')
    .single();

  if (updateError) {
    console.error('Falha ao atualizar status da conversa.', updateError);
    return Response.json({ ok: false, error: 'Não foi possível atualizar o status.' }, { status: 500 });
  }

  return Response.json({ ok: true, conversation: data });
}
