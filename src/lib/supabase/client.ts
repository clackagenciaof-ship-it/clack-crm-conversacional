import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseStatus() {
  return {
    connected: hasSupabaseConfig(),
    url: supabaseUrl || null,
    message: hasSupabaseConfig()
      ? 'Supabase configurado. O CRM já pode usar banco real quando os serviços forem ligados.'
      : 'Supabase ainda não configurado. O MVP segue usando dados demonstrativos locais.'
  };
}

export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}
