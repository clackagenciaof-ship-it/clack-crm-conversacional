import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/crm/permissions';

function createAuthVerifier() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } }) as any;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  return authorization.slice(7).trim();
}

export async function POST(request: Request) {
  let payload: { userId?: string };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  if (!payload.userId) return Response.json({ ok: false, error: 'Usuário é obrigatório.' }, { status: 400 });

  const token = getBearerToken(request);
  if (!token) return Response.json({ ok: false, error: 'Sessão não informada.' }, { status: 401 });

  const authVerifier = createAuthVerifier();
  const service = createSupabaseServiceClient();
  if (!authVerifier || !service) return Response.json({ ok: false, error: 'Supabase não configurado no servidor.' }, { status: 500 });

  const { data: authData, error: authError } = await authVerifier.auth.getUser(token);
  if (authError || !authData?.user) return Response.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 });

  const { data: creatorProfile } = await service
    .from('profiles')
    .select('id, company_id, role, status')
    .eq('id', authData.user.id)
    .single();

  if (!creatorProfile?.company_id) return Response.json({ ok: false, error: 'Perfil criador não encontrado.' }, { status: 403 });
  if (creatorProfile.status !== 'active' || normalizeRole(creatorProfile.role) !== 'Admin Empresa') {
    return Response.json({ ok: false, error: 'Apenas Admin Empresa pode enviar acessos.' }, { status: 403 });
  }

  const { data: targetProfile, error: targetError } = await service
    .from('profiles')
    .select('id, company_id, name, email, role, status')
    .eq('id', payload.userId)
    .single();

  if (targetError || !targetProfile) return Response.json({ ok: false, error: 'Usuário não encontrado.' }, { status: 404 });
  if (targetProfile.company_id !== creatorProfile.company_id) return Response.json({ ok: false, error: 'Usuário fora da empresa atual.' }, { status: 403 });

  const { data: company } = await service.from('companies').select('id, name').eq('id', creatorProfile.company_id).single();

  await service.from('profiles').update({ invite_status: 'sent', last_invited_at: new Date().toISOString() }).eq('id', targetProfile.id);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://clack-crm-conversacional.vercel.app';
  const message = [
    `Olá, ${targetProfile.name}!`,
    'Seu acesso ao CLACK CRM Conversacional foi liberado.',
    `Empresa: ${company?.name || 'Empresa vinculada'}`,
    `Perfil: ${targetProfile.role}`,
    `E-mail: ${targetProfile.email}`,
    `Link: ${appUrl}`,
    'Use a senha inicial informada pelo Admin Empresa e mantenha seus dados protegidos.'
  ].join('\n');

  await service.from('company_plan_audit_logs').insert({
    company_id: creatorProfile.company_id,
    actor_profile_id: creatorProfile.id,
    action: 'user_access_sent',
    next_value: { id: targetProfile.id, name: targetProfile.name, email: targetProfile.email, role: targetProfile.role, status: targetProfile.status }
  });

  return Response.json({ ok: true, message });
}
