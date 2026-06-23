import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client';

export type LoginResult = {
  ok: boolean;
  mode: 'demo' | 'supabase';
  message: string;
};

async function isProfileActive(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', userId)
    .maybeSingle();

  if (error) return false;
  return data?.status === 'active';
}

export async function hasActiveSupabaseSession() {
  if (!hasSupabaseConfig()) return false;

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return false;

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;

  const active = await isProfileActive(supabase as any, data.session.user.id);
  if (!active) {
    await supabase.auth.signOut();
    return false;
  }

  return true;
}

export async function signInWithSupabaseOrDemo(email: string, password: string): Promise<LoginResult> {
  if (!hasSupabaseConfig()) {
    return {
      ok: true,
      mode: 'demo',
      message: 'Acesso liberado em modo demonstração.'
    };
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return {
      ok: true,
      mode: 'demo',
      message: 'Supabase indisponível. Acesso liberado em modo demonstração.'
    };
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return {
      ok: false,
      mode: 'supabase',
      message: error?.message || 'Não foi possível entrar com esse e-mail e senha.'
    };
  }

  const active = await isProfileActive(supabase as any, data.user.id);
  if (!active) {
    await supabase.auth.signOut();
    return {
      ok: false,
      mode: 'supabase',
      message: 'Acesso inativo. Procure o Admin Empresa.'
    };
  }

  return {
    ok: true,
    mode: 'supabase',
    message: 'Login realizado com Supabase Auth.'
  };
}

export async function signOutSupabase() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) return;
  await supabase.auth.signOut();
}
