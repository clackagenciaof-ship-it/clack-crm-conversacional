import { createSupabaseBrowserClient, getFreshSession, hasSupabaseConfig } from '@/lib/supabase/client';

export type LoginResult = {
  ok: boolean;
  mode: 'supabase';
  message: string;
};

type AccessStatus = {
  ok: boolean;
  message?: string;
};

function isClackAdminEmail(email?: string | null) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return normalizedEmail === 'will@clackcrm.com.br' || normalizedEmail === 'kkayron.w@gmail.com' || normalizedEmail.endsWith('@clackcrm.com.br');
}

async function checkAccessStatus(supabase: any, userId: string): Promise<AccessStatus> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, status, company_id')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) return { ok: false, message: 'Perfil de acesso não encontrado.' };
  if (profile.status !== 'active') return { ok: false, message: 'Acesso inativo. Procure o Admin Empresa.' };
  if (isClackAdminEmail(profile.email)) return { ok: true };
  if (!profile.company_id) return { ok: false, message: 'Usuário sem empresa vinculada.' };

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('status, billing_status')
    .eq('id', profile.company_id)
    .maybeSingle();

  if (companyError || !company) return { ok: false, message: 'Empresa vinculada não encontrada.' };
  if (company.status !== 'active') return { ok: false, message: 'Empresa inativa. Procure a equipe ADM Clack.' };
  if (company.billing_status === 'blocked') return { ok: false, message: 'Plano bloqueado. Procure a equipe ADM Clack para regularizar o acesso.' };

  return { ok: true };
}

export async function hasActiveSupabaseSession() {
  if (!hasSupabaseConfig()) return false;
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;

  try {
    const session = await getFreshSession();
    if (!session) return false;
    const access = await checkAccessStatus(supabase as any, session.user.id);
    if (!access.ok) {
      await supabase.auth.signOut();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function signInWithSupabaseOrDemo(email: string, password: string): Promise<LoginResult> {
  if (!email.trim() || !password.trim()) {
    return { ok: false, mode: 'supabase', message: 'Informe e-mail e senha para entrar.' };
  }

  if (!hasSupabaseConfig()) {
    return { ok: false, mode: 'supabase', message: 'Banco de produção não configurado. Use o botão de demonstração apenas para apresentação.' };
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return { ok: false, mode: 'supabase', message: 'Não foi possível iniciar a conexão segura com o Supabase.' };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      return { ok: false, mode: 'supabase', message: error?.message || 'Não foi possível entrar com esse e-mail e senha.' };
    }

    const access = await checkAccessStatus(supabase as any, data.user.id);
    if (!access.ok) {
      await supabase.auth.signOut();
      return { ok: false, mode: 'supabase', message: access.message || 'Acesso bloqueado.' };
    }

    return { ok: true, mode: 'supabase', message: 'Dados reais conectados com segurança.' };
  } catch (error) {
    return {
      ok: false,
      mode: 'supabase',
      message: error instanceof Error ? error.message : 'Não foi possível entrar. Tente novamente.'
    };
  }
}

export async function signOutSupabase() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  try { await supabase.auth.signOut(); } catch { /* sessão local já será encerrada */ }
}
