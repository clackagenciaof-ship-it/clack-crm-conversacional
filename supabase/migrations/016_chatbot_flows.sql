-- CLACK CRM Conversacional — Fase 10.2: fluxos automáticos e chatbot
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 015.

create table if not exists chatbot_flows (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  channel text not null default 'WhatsApp',
  objective text,
  trigger_phrase text,
  status text not null default 'draft',
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_flow_steps (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  flow_id uuid not null references chatbot_flows(id) on delete cascade,
  position integer not null default 1,
  step_type text not null default 'message',
  message text not null,
  delay_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

alter table chatbot_flows enable row level security;
alter table chatbot_flow_steps enable row level security;

drop policy if exists "chatbot flows read company" on chatbot_flows;
create policy "chatbot flows read company" on chatbot_flows
for select
using (company_id = public.current_company_id());

drop policy if exists "chatbot flows manage company managers" on chatbot_flows;
create policy "chatbot flows manage company managers" on chatbot_flows
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "chatbot steps read company" on chatbot_flow_steps;
create policy "chatbot steps read company" on chatbot_flow_steps
for select
using (company_id = public.current_company_id());

drop policy if exists "chatbot steps manage company managers" on chatbot_flow_steps;
create policy "chatbot steps manage company managers" on chatbot_flow_steps
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

create index if not exists idx_chatbot_flows_company_active on chatbot_flows(company_id, active, status);
create index if not exists idx_chatbot_steps_flow_position on chatbot_flow_steps(flow_id, position);

insert into chatbot_flows (company_id, name, channel, objective, trigger_phrase, status, active)
select c.id,
       'Boas-vindas comercial',
       'WhatsApp',
       'Receber o lead, apresentar atendimento humano e iniciar qualificação.',
       'oi, olá, quero atendimento, quero saber mais',
       'active',
       true
from companies c
where not exists (
  select 1 from chatbot_flows cf
  where cf.company_id = c.id and cf.name = 'Boas-vindas comercial'
);

insert into chatbot_flow_steps (company_id, flow_id, position, step_type, message, delay_minutes)
select cf.company_id, cf.id, 1, 'message', 'Olá! Seja bem-vindo(a). Recebemos seu contato e já vamos te ajudar.', 0
from chatbot_flows cf
where cf.name = 'Boas-vindas comercial'
and not exists (select 1 from chatbot_flow_steps s where s.flow_id = cf.id and s.position = 1);

insert into chatbot_flow_steps (company_id, flow_id, position, step_type, message, delay_minutes)
select cf.company_id, cf.id, 2, 'message', 'Para agilizar, me diga seu nome, cidade e qual solução você procura.', 1
from chatbot_flows cf
where cf.name = 'Boas-vindas comercial'
and not exists (select 1 from chatbot_flow_steps s where s.flow_id = cf.id and s.position = 2);

insert into chatbot_flow_steps (company_id, flow_id, position, step_type, message, delay_minutes)
select cf.company_id, cf.id, 3, 'handoff', 'Perfeito. Vou direcionar seu atendimento para um especialista da equipe.', 2
from chatbot_flows cf
where cf.name = 'Boas-vindas comercial'
and not exists (select 1 from chatbot_flow_steps s where s.flow_id = cf.id and s.position = 3);
