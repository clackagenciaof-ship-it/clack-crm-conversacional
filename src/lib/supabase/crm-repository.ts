import { createSupabaseBrowserClient } from './client';
import type { Database } from './database.types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ContactInsert = Database['public']['Tables']['contacts']['Insert'];
type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert'];
type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
type QuickMessageInsert = Database['public']['Tables']['quick_messages']['Insert'];
type ActivityLogInsert = Database['public']['Tables']['activity_logs']['Insert'];

type WhatsAppAccountPayload = {
  company_id: string;
  phone_number_id: string;
  display_phone_number?: string | null;
  business_account_id?: string | null;
  status?: string;
};

function getClientOrThrow() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

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

export async function updateContact(id: string, payload: Database['public']['Tables']['contacts']['Update']) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('contacts')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteContact(id: string) {
  const supabase = getClientOrThrow();
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

export async function deleteTask(id: string) {
  const supabase = getClientOrThrow();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id);

  if (error) throw error;
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

export async function updateQuickMessage(id: string, payload: Database['public']['Tables']['quick_messages']['Update']) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('quick_messages')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteQuickMessage(id: string) {
  const supabase = getClientOrThrow();
  const { error } = await supabase
    .from('quick_messages')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function listWhatsAppAccounts(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Array<WhatsAppAccountPayload & { id: string; created_at: string; updated_at: string }>;
}

export async function createWhatsAppAccount(payload: WhatsAppAccountPayload) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateWhatsAppAccount(id: string, payload: Partial<WhatsAppAccountPayload>) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listActivityLogs(companyId: string) {
  const supabase = getClientOrThrow();
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Database['public']['Tables']['activity_logs']['Row'][];
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
