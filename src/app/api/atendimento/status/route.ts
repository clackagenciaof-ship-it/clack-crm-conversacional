import { createSupabaseServiceClient } from '@/lib/supabase/server';

const allowedStatuses = ['Aberta', 'Em atendimento', 'Resolvida', 'Arquivada'];

type StatusPayload = {
  companyId?: string;
  conversationId?: string;
  status?: string;
};

export async function POST(request: Request) {
  let payload: StatusPayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.companyId || !payload.conversationId || !payload.status) {
    return Response.json({ ok: false, error: 'Empresa, conversa e status são obrigatórios.' }, { status: 400 });
  }

  if (!allowedStatuses.includes(payload.status)) {
    return Response.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return Response.json({ ok: false, error: 'Supabase service role não configurado.' }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('whatsapp_conversations')
    .update({ status: payload.status, updated_at: new Date().toISOString() })
    .eq('company_id', payload.companyId)
    .eq('id', payload.conversationId)
    .select('*')
    .single();

  if (error) {
    console.error('Falha ao atualizar status da conversa.', error);
    return Response.json({ ok: false, error: 'Não foi possível atualizar o status.' }, { status: 500 });
  }

  return Response.json({ ok: true, conversation: data });
}
