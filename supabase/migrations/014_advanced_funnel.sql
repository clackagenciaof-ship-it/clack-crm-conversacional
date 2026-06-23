-- CLACK CRM Conversacional — Fase 8: Funil avançado
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 013.

alter table opportunities
add column if not exists probability integer not null default 20 check (probability >= 0 and probability <= 100),
add column if not exists next_action text,
add column if not exists source_campaign text,
add column if not exists custom_fields jsonb not null default '{}'::jsonb;

alter table pipeline_stages
add column if not exists color text,
add column if not exists probability integer not null default 20 check (probability >= 0 and probability <= 100),
add column if not exists active boolean not null default true;

update pipeline_stages set probability = 10 where name = 'Novo Lead' and probability = 20;
update pipeline_stages set probability = 20 where name = 'Primeiro Contato' and probability = 20;
update pipeline_stages set probability = 35 where name = 'Qualificação' and probability = 20;
update pipeline_stages set probability = 50 where name = 'Apresentação Enviada' and probability = 20;
update pipeline_stages set probability = 70 where name = 'Proposta Enviada' and probability = 20;
update pipeline_stages set probability = 85 where name = 'Negociação' and probability = 20;
update pipeline_stages set probability = 100 where name = 'Fechado';
update pipeline_stages set probability = 0 where name = 'Perdido';

create table if not exists pipeline_stage_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  stage_id uuid references pipeline_stages(id) on delete cascade,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);

alter table pipeline_stage_audit_logs enable row level security;

drop policy if exists "pipeline audit read by company managers" on pipeline_stage_audit_logs;
create policy "pipeline audit read by company managers" on pipeline_stage_audit_logs
for select
using (company_id = public.current_company_id() and public.current_profile_is_manager());

create index if not exists idx_pipeline_stages_company_active_position on pipeline_stages(company_id, active, position);
create index if not exists idx_opportunities_company_stage_probability on opportunities(company_id, stage_name, probability);
create index if not exists idx_pipeline_stage_audit_company on pipeline_stage_audit_logs(company_id, created_at desc);
