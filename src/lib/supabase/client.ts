import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let browserClient: SupabaseClient<Database> | null = null;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseStatus() {
  return {
    connected: hasSupabaseConfig(),
    url: supabaseUrl || null,
    message: hasSupabaseConfig()
      ? 'Supabase conectado à operação.'
      : 'Supabase ainda não configurado.'
  };
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  if (browserClient) return browserClient;

  browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'clack-one-auth'
    }
  });
  return browserClient;
}

async function getUsableSession(client: SupabaseClient<Database>): Promise<Session | null> {
  const { data, error } = await client.auth.getSession();
  if (!error && data.session) {
    const expiresAt = Number(data.session.expires_at || 0) * 1000;
    if (!expiresAt || expiresAt - Date.now() > 90_000) return data.session;
  }

  const refreshed = await client.auth.refreshSession();
  if (refreshed.error) return null;
  return refreshed.data.session || null;
}

export async function getFreshAccessToken() {
  const client = createSupabaseBrowserClient();
  if (!client) throw new Error('Supabase não configurado.');
  const session = await getUsableSession(client);
  if (!session?.access_token) throw new Error('Sua sessão precisa ser renovada. Entre novamente para continuar.');
  return session.access_token;
}

export async function getFreshSession() {
  const client = createSupabaseBrowserClient();
  if (!client) return null;
  return getUsableSession(client);
}
