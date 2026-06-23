-- CLACK CRM Conversacional — Fase 14 + Fase 15
-- White label por empresa + IA Agente Will operacional
-- Execute uma vez no SQL Editor do Supabase após a migration 019.

create table if not exists company_branding (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade unique,
  app_name text not null default 'CLACK CRM',
  brand_name text not null default 'CLACK CRM Conversacional',
  logo_url text,
  favicon_url text,
  primary_color text not null default '#005954',
  secondary_color text not null default '#338b85',
  accent_color text not null default '#5dc1b9',
  background_color text not null default '#f4fffe',
  sidebar_color text not null default '#005954',
  welcome_title text not null default 'Venda mais, atenda melhor e acompanhe seu funil em tempo real.',
  welcome_subtitle text not null default 'Seu CRM inteligente de vendas e atendimento.',
  custom_domain text,
  white_label_enabled boolean not null default true,
  status text not null default 'Ativo',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_agent_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade unique,
  agent_name text not null default 'Will',
  enabled boolean not null default true,
  tone text not null default 'Consultivo, humano, objetivo e comercial',
  specialty text not null default 'Vendas, atendimento, follow-up, recuperação de proposta e gestão comercial',
  instructions text not null default 'Ajude a equipe a vender mais, responder com clareza, priorizar oportunidades e manter o histórico organizado no CRM.',
  handoff_message text not null default 'Vou chamar um especialista da equipe para continuar com você.',
  fallback_message text not null default 'Entendi. Vou registrar aqui e direcionar para o melhor atendimento.',
  knowledge_base text,
  auto_suggest boolean not null default true,
  can_create_tasks boolean not null default true,
  can_suggest_products boolean not null default true,
  can_suggest_messages boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_agent_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  agent_settings_id uuid references ai_agent_settings(id) on delete set null,
  profile_id uuid references profiles(id) on delete set null,
  context text,
  prompt text,
  suggestion text,
  action_type text not null default 'suggestion',
  created_at timestamptz not null default now()
);

alter table company_branding enable row level security;
alter table ai_agent_settings enable row level security;
alter table ai_agent_logs enable row level security;

drop policy if exists "company branding read company" on company_branding;
create policy "company branding read company" on company_branding
for select
using (company_id = public.current_company_id());

drop policy if exists "company branding manage managers" on company_branding;
create policy "company branding manage managers" on company_branding
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "ai settings read company" on ai_agent_settings;
create policy "ai settings read company" on ai_agent_settings
for select
using (company_id = public.current_company_id());

drop policy if exists "ai settings manage managers" on ai_agent_settings;
create policy "ai settings manage managers" on ai_agent_settings
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "ai logs read company" on ai_agent_logs;
create policy "ai logs read company" on ai_agent_logs
for select
using (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "ai logs insert company" on ai_agent_logs;
create policy "ai logs insert company" on ai_agent_logs
for insert
with check (company_id = public.current_company_id());

create index if not exists idx_company_branding_company on company_branding(company_id);
create index if not exists idx_ai_agent_settings_company on ai_agent_settings(company_id);
create index if not exists idx_ai_agent_logs_company on ai_agent_logs(company_id, created_at desc);

insert into company_branding (company_id, created_by)
select c.id, null
from companies c
where not exists (select 1 from company_branding cb where cb.company_id = c.id);

insert into ai_agent_settings (company_id, created_by)
select c.id, null
from companies c
where not exists (select 1 from ai_agent_settings ai where ai.company_id = c.id);
