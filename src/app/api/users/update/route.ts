import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/crm/permissions';
import type { UserRole } from '@/types/crm';

const allowedRoles: UserRole[] = ['Admin Empresa', 'Gestor', 'Vendedor', 'Atendente', 'Financeiro'];
const allowedStatuses = ['active', 'inactive'];

type UpdateUserPayload = {
  userId?: string;
  name?: string;
  role?: UserRole;
  status?: 'active' | 'inactive';
};

function createAuthVerifier() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }) as any;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  return authorization.slice(7).trim();
}

export async function POST(request: Request) {
  let payload: UpdateUserPayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.userId) {
    return Response.json({ ok: false, error: 'Usuário é obrigatório.' }, { status: 400 });
  }

  if (payload.role && !allowedRoles.includes(payload.role)) {
    return Response.json({ ok: false, error: 'Perfil inválido.' }, { status: 400 });
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    return Response.json({ ok: false, error: 'Status inválido.' }, { status: 400 });
  }

  const token = getBearerToken(request);
  if (!token) {
    return Response.json({ ok: false, error: 'Sessão não informada.' }, { status: 401 });
  }

  const authVerifier = createAuthVerifier();
  const service = createSupabaseServiceClient();

  if (!authVerifier || !service) {
    return Response.json({ ok: false, error: 'Supabase não configurado no servidor.' }, { status: 500 });
  }

  const { data: authData, error: authError } = await authVerifier.auth.getUser(token);

  if (authError || !authData?.user) {
    return Response.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });
  }

  const { data: creatorProfile, error: creatorError } = await service
    .from('profiles')
    .select('id, company_id, role, status')
    .eq('id', authData.user.id)
    .single();

  if (creatorError || !creatorProfile?.company_id) {
    return Response.json({ ok: false, error: 'Perfil criador não encontrado.' }, { status: 403 });
  }

  if (creatorProfile.status !== 'active') {
    return Response.json({ ok: false, error: 'Usuário criador inativo.' }, { status: 403 });
  }

  if (normalizeRole(creatorProfile.role) !== 'Admin Empresa') {
    return Response.json({ ok: false, error: 'Apenas Admin Empresa pode alterar acessos.' }, { status: 403 });
  }

  const { data: targetProfile, error: targetError } = await service
    .from('profiles')
    .select('id, company_id, role, status')
    .eq('id', payload.userId)
    .single();

  if (targetError || !targetProfile) {
    return Response.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 });
  }

  if (targetProfile.company_id !== creatorProfile.company_id) {
    return Response.json({ ok: false, error: 'Usuário fora da empresa atual.' }, { status: 403 });
  }

  if (payload.userId === creatorProfile.id && payload.status === 'inactive') {
    return Response.json({ ok: false, error: 'O Admin atual não pode inativar o próprio acesso.' }, { status: 400 });
  }

  const updatePayload: Record<string, string> = {};
  if (payload.name?.trim()) updatePayload.name = payload.name.trim();
  if (payload.role) updatePayload.role = payload.role;
  if (payload.status) updatePayload.status = payload.status;

  const { data: profile, error: updateError } = await service
    .from('profiles')
    .update(updatePayload)
    .eq('id', payload.userId)
    .select('*')
    .single();

  if (updateError) {
    console.error('Falha ao atualizar perfil.', updateError);
    return Response.json({ ok: false, error: 'Não foi possível atualizar o acesso.' }, { status: 500 });
  }

  return Response.json({ ok: true, profile });
}
