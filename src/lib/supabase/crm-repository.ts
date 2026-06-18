import { createSupabaseBrowserClient } from './client';
import type { Database } from './database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type QuickMessageInsert = Database['public']['Tables']['quick_messages']['Insert'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

function getClientOrThrow() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  // Mantemos os tipos dos payloads do CRM, mas flexibilizamos o client neste MVP.
  // Isso evita conflito de overloads do supabase-js enquanto a tipagem gerada oficial
  // ainda não vem direto do projeto Supabase real.
  return supabase as any;
}

export async function getCurrentProfile() {
  const supabase = getClientOrThrow();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userData.user.id)
    .single();

  if (error) throw error;
  return data as ProfileRow;
}

export async function findStageIdByName(companyId: string, stageName: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('company_id', companyId)
    .eq('name', stageName)
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

export async function listPipelineStages(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('id, name, position')
    .eq('company_id', companyId)
    .order('position', { ascending: true });

  if (error) throw error;
  return data as Array<{ id: string; name: string; position: number }>;
}

export async function listContacts(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createContact(payload: ContactInsert) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('contacts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listOpportunities(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createOpportunity(payload: OpportunityInsert) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('opportunities')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateOpportunity(id: string, payload: Database['public']['Tables']['opportunities']['Update']) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('opportunities')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listTasks(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createTask(payload: TaskInsert) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(id: string, payload: Database['public']['Tables']['tasks']['Update']) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listQuickMessages(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('quick_messages')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createQuickMessage(payload: QuickMessageInsert) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('quick_messages')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function createActivityLog(payload: ActivityLogInsert) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('activity_logs')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}
