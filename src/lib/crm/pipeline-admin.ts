import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

export type PipelineStageRow = {
  id: string;
  company_id: string;
  pipeline_id?: string | null;
  name: string;
  position: number;
  color?: string | null;
  probability?: number | null;
  active?: boolean | null;
  status?: string | null;
};

function client() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

async function getOrCreateDefaultPipeline(supabase: any, companyId: string) {
  const { data: existing, error: findError } = await supabase
    .from('pipelines')
    .select('id')
    .eq('company_id', companyId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (findError) throw findError;
  if (existing?.[0]?.id) return existing[0].id as string;

  const { data: created, error: createError } = await supabase
    .from('pipelines')
    .insert({ company_id: companyId, name: 'Funil comercial', is_default: true, status: 'active' })
    .select('id')
    .single();

  if (createError) throw createError;
  return created.id as string;
}

export async function loadCompanyPipelineStages() {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) return [];
  const supabase = client();

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('company_id', profile.company_id)
    .order('position', { ascending: true });

  if (error) throw error;
  return ((data || []) as PipelineStageRow[]).filter((stage) => stage.active !== false && stage.status !== 'archived');
}

export async function savePipelineStage(input: Partial<PipelineStageRow> & { name: string }) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error('Usuário sem empresa vinculada.');
  const supabase = client();
  const pipelineId = input.pipeline_id || await getOrCreateDefaultPipeline(supabase, profile.company_id);

  const payload = {
    company_id: profile.company_id,
    pipeline_id: pipelineId,
    name: input.name.trim(),
    position: Number(input.position || 1),
    color: input.color || null,
    probability: Number(input.probability ?? 20),
    active: input.active ?? true,
    status: 'active'
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
    .update({ active: false, status: 'archived' })
    .eq('id', stageId)
    .select('*')
    .single();
  if (error) throw error;
  return data as PipelineStageRow;
}
