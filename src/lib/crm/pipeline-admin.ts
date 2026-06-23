import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

export type PipelineStageRow = {
  id: string;
  company_id: string;
  name: string;
  position: number;
  color?: string | null;
  probability?: number | null;
  active?: boolean | null;
};

function client() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export async function loadCompanyPipelineStages() {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) return [];
  const supabase = client();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('company_id', profile.company_id)
    .eq('active', true)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data || []) as PipelineStageRow[];
}

export async function savePipelineStage(input: Partial<PipelineStageRow> & { name: string }) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada.');
  const supabase = client();
  const payload = {
    company_id: profile.company_id,
    name: input.name.trim(),
    position: Number(input.position || 1),
    color: input.color || null,
    probability: Number(input.probability ?? 20),
    active: input.active ?? true
  };
  const query = input.id
    ? supabase.from('pipeline_stages').update(payload).eq('id', input.id).select('*').single()
    : supabase.from('pipeline_stages').insert(payload).select('*').single();
  const { data, error } = await query;
  if (error) throw error;
  return data as PipelineStageRow;
}

export async function archivePipelineStage(stageId: string) {
  const supabase = client();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .update({ active: false })
    .eq('id', stageId)
    .select('*')
    .single();
  if (error) throw error;
  return data as PipelineStageRow;
}
