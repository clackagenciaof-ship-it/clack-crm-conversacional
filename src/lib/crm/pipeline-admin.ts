import { createSupabaseBrowserClient } from '@/lib/supabase/client';

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

export type PipelineStagesResult = {
  stages: PipelineStageRow[];
  archivedStages: PipelineStageRow[];
};

async function getSessionHeader() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const sessionToken = data.session?.access_token;
  if (!sessionToken) throw new Error('Sessão expirada. Entre novamente no CRM.');
  return { Authorization: `Bearer ${sessionToken}` };
}

export async function loadCompanyPipelineStagesFull(): Promise<PipelineStagesResult> {
  const response = await fetch('/api/funnel/stages', {
    headers: await getSessionHeader()
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar etapas do funil.');
  return {
    stages: (result.stages || []) as PipelineStageRow[],
    archivedStages: (result.archivedStages || []) as PipelineStageRow[]
  };
}

export async function loadCompanyPipelineStages() {
  const result = await loadCompanyPipelineStagesFull();
  return result.stages;
}

export async function savePipelineStage(input: Partial<PipelineStageRow> & { name: string }) {
  const response = await fetch('/api/funnel/stages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getSessionHeader())
    },
    body: JSON.stringify(input)
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar a etapa do funil.');
  return result.stage as PipelineStageRow;
}

async function updateArchivedState(stageId: string, action: 'archive' | 'restore') {
  const response = await fetch('/api/funnel/stages/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getSessionHeader())
    },
    body: JSON.stringify({ stageId, action })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível atualizar a etapa.');
  return result.stage as PipelineStageRow;
}

export async function archivePipelineStage(stageId: string) {
  return updateArchivedState(stageId, 'archive');
}

export async function restorePipelineStage(stageId: string) {
  return updateArchivedState(stageId, 'restore');
}
