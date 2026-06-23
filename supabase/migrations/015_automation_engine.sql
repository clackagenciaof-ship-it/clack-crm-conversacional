-- CLACK CRM Conversacional — Fase 10: motor de automações comerciais
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 014.

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  trigger_type text not null,
  action_type text not null,
  stage_name text,
  delay_minutes integer not null default 0,
  message text,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  automation_rule_id uuid references automation_rules(id) on delete cascade,
  target_type text,
  target_id uuid,
  status text not null default 'executed',
  result text,
  created_at timestamptz not null default now()
);

alter table automation_rules enable row level security;
alter table automation_runs enable row level security;

drop policy if exists "automation rules read company" on automation_rules;
create policy "automation rules read company" on automation_rules
for select
using (company_id = public.current_company_id());

drop policy if exists "automation rules manage company managers" on automation_rules;
create policy "automation rules manage company managers" on automation_rules
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "automation runs read company" on automation_runs;
create policy "automation runs read company" on automation_runs
for select
using (company_id = public.current_company_id());

create index if not exists idx_automation_rules_company_active on automation_rules(company_id, active, trigger_type);
create index if not exists idx_automation_runs_company_created on automation_runs(company_id, created_at desc);
create index if not exists idx_automation_runs_rule_target on automation_runs(automation_rule_id, target_type, target_id, created_at desc);

insert into automation_rules (company_id, name, description, trigger_type, action_type, stage_name, delay_minutes, message, active, config)
select c.id,
       'Lead quente sem follow-up',
       'Cria tarefa automática quando existe lead quente parado para abordagem comercial.',
       'lead_hot_idle',
       'create_task',
       null,
       60,
       'Fazer follow-up com lead quente e registrar retorno.',
       true,
       '{"priority":"Alta","task_type":"Follow-up"}'::jsonb
from companies c
where not exists (
  select 1 from automation_rules ar
  where ar.company_id = c.id and ar.trigger_type = 'lead_hot_idle'
);

insert into automation_rules (company_id, name, description, trigger_type, action_type, stage_name, delay_minutes, message, active, config)
select c.id,
       'Oportunidade em proposta',
       'Cria tarefa para retorno quando uma oportunidade entra ou permanece na etapa de proposta.',
       'opportunity_stage_idle',
       'create_task',
       'Proposta Enviada',
       1440,
       'Retomar proposta enviada e conduzir para negociação.',
       true,
       '{"priority":"Média","task_type":"Comercial"}'::jsonb
from companies c
where not exists (
  select 1 from automation_rules ar
  where ar.company_id = c.id and ar.trigger_type = 'opportunity_stage_idle'
);
