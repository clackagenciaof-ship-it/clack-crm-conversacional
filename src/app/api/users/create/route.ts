import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/crm/permissions';
import type { UserRole } from '@/types/crm';

const allowedRoles: UserRole[] = ['Admin Empresa', 'Gestor', 'Vendedor', 'Atendente', 'Financeiro'];

type CreateUserPayload = {
  name?: string;
  email?: string;
  password?: string;
  role?: UserRole;
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

async function getCompanyPlan(service: any, companyId: string) {
  const { data, error } = await service
    .from('companies')
    .select('plan_name, user_limit, billing_status')
    .eq('id', companyId)
    .single();

  if (error) {
    console.warn('Plano da empresa indisponível. Aplicando limite padrão.', error);
    return { plan_name: 'Inicial', user_limit: 5, billing_status: 'active' };
  }

  return {
    plan_name: data?.plan_name || 'Inicial',
    user_limit: Number(data?.user_limit || 5),
    billing_status: data?.billing_status || 'active'
  };
}

async function countActiveUsers(service: any, companyId: string) {
  const { count, error } = await service
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active');

  if (error) throw error;
  return count || 0;
}

export async function POST(request: Request) {
  let payload: CreateUserPayload;

  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 });
  }

  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password?.trim();
  const role = payload.role || 'Vendedor';

  if (!name || !email || !password || !role) {
    return Response.json({ ok: false, error: 'Nome, e-mail, senha e perfil são obrigatórios.' }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ ok: false, error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  if (!allowedRoles.includes(role)) {
    return Response.json({ ok: false, error: 'Perfil inválido.' }, { status: 400 });
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
    return Response.json({ ok: false, error: 'Apenas Admin Empresa pode criar novos acessos.' }, { status: 403 });
  }

  const plan = await getCompanyPlan(service, creatorProfile.company_id);

  if (plan.billing_status !== 'active') {
    return Response.json({ ok: false, error: 'Plano bloqueado. Procure a equipe ADM Clack para regularizar o acesso.' }, { status: 403 });
  }

  const activeUsers = await countActiveUsers(service, creatorProfile.company_id);

  if (activeUsers >= plan.user_limit) {
    return Response.json({
      ok: false,
      error: `Limite de usuários atingido no Plano ${plan.plan_name}. Para adicionar mais acessos, solicite upgrade do plano.`
    }, { status: 403 });
  }

  const { data: existingProfile } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existingProfile?.id) {
    return Response.json({ ok: false, error: 'Já existe um usuário com esse e-mail.' }, { status: 409 });
  }

  const { data: createdUser, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role }
  });

  if (createError || !createdUser?.user) {
    console.error('Falha ao criar usuário Supabase.', createError);
    return Response.json({ ok: false, error: createError?.message || 'Não foi possível criar o usuário.' }, { status: 400 });
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .upsert({
      id: createdUser.user.id,
      company_id: creatorProfile.company_id,
      name,
      email,
      role,
      status: 'active'
    })
    .select('*')
    .single();

  if (profileError) {
    console.error('Falha ao criar perfil do usuário.', profileError);
    return Response.json({ ok: false, error: 'Usuário criado, mas o perfil não foi salvo.' }, { status: 500 });
  }

  return Response.json({ ok: true, profile, plan, activeUsers: activeUsers + 1 });
}
