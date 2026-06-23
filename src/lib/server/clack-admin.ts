import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

export type AdminRequestContext = {
  service: any;
  authUserId: string;
  profile: {
    id: string;
    company_id: string | null;
    name: string;
    email: string;
    role: string;
    status: string;
  };
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

export function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) return null;
  return authorization.slice(7).trim();
}

export function isClackAdminEmail(email?: string | null) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const configuredAdmins = (process.env.CLACK_ADMIN_EMAILS || 'will@clackcrm.com.br,kkayron.w@gmail.com')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return configuredAdmins.includes(normalizedEmail) || normalizedEmail.endsWith('@clackcrm.com.br');
}

export async function getAdminRequestContext(request: Request): Promise<{ context?: AdminRequestContext; error?: Response }> {
  const token = getBearerToken(request);
  if (!token) {
    return { error: Response.json({ ok: false, error: 'Sessão não informada.' }, { status: 401 }) };
  }

  const authVerifier = createAuthVerifier();
  const service = createSupabaseServiceClient();

  if (!authVerifier || !service) {
    return { error: Response.json({ ok: false, error: 'Supabase não configurado no servidor.' }, { status: 500 }) };
  }

  const { data: authData, error: authError } = await authVerifier.auth.getUser(token);

  if (authError || !authData?.user) {
    return { error: Response.json({ ok: false, error: 'Sessão inválida.' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, company_id, name, email, role, status')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    return { error: Response.json({ ok: false, error: 'Perfil não encontrado.' }, { status: 403 }) };
  }

  if (profile.status !== 'active') {
    return { error: Response.json({ ok: false, error: 'Usuário inativo.' }, { status: 403 }) };
  }

  return {
    context: {
      service,
      authUserId: authData.user.id,
      profile
    }
  };
}

export function assertClackAdmin(context: AdminRequestContext) {
  return isClackAdminEmail(context.profile.email);
}

export function planLimitFromName(planName?: string | null, customLimit?: number | null) {
  if (customLimit && customLimit > 0) return customLimit;

  const normalizedPlan = (planName || '').trim().toLowerCase();
  if (normalizedPlan.includes('growth')) return 10;
  if (normalizedPlan.includes('pro')) return 25;
  return 5;
}
