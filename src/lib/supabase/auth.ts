import { createSupabaseBrowserClient, hasSupabaseConfig } from '@/lib/supabase/client';

export type LoginResult = {
  ok: boolean;
  mode: 'demo' | 'supabase';
  message: string;
};

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

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      mode: 'supabase',
      message: error.message || 'Não foi possível entrar com esse e-mail e senha.'
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
