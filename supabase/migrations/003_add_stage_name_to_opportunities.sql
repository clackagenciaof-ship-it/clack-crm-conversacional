-- CLACK CRM Conversacional — persistência direta da etapa do Kanban
-- Execute este arquivo uma vez no SQL Editor do Supabase.

alter table opportunities
add column if not exists stage_name text not null default 'Novo Lead';

update opportunities
set stage_name = pipeline_stages.name
from pipeline_stages
where opportunities.stage_id = pipeline_stages.id
  and opportunities.company_id = pipeline_stages.company_id;

update opportunities
set stage_name = 'Fechado'
where status = 'Ganha';

update opportunities
set stage_name = 'Perdido'
where status = 'Perdida';
