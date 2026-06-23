-- CLACK CRM Conversacional — Fase 12 + Fase 13
-- Produtos/serviços + Onboarding SaaS operacional
-- Execute uma vez no SQL Editor do Supabase após a migration 018.

create table if not exists product_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text not null default 'Serviço',
  description text,
  price numeric(12,2) not null default 0,
  billing_type text not null default 'Único',
  status text not null default 'Ativo',
  tags text[] not null default '{}',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table opportunities
add column if not exists product_service_id uuid references product_services(id) on delete set null,
add column if not exists product_service_name text,
add column if not exists product_service_price numeric(12,2);

alter table finance_invoices
add column if not exists product_service_id uuid references product_services(id) on delete set null;

create table if not exists company_onboarding (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade unique,
  status text not null default 'Em implantação',
  current_step text not null default 'Diagnóstico inicial',
  launch_score integer not null default 0,
  checklist jsonb not null default '{"empresa":false,"usuarios":false,"produtos":false,"funil":false,"mensagens":false,"atendimento":false,"financeiro":false,"automacoes":false,"whatsapp":false,"treinamento":false}',
  notes text,
  completed_at timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists onboarding_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  onboarding_id uuid references company_onboarding(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

alter table product_services enable row level security;
alter table company_onboarding enable row level security;
alter table onboarding_events enable row level security;

drop policy if exists "product services read company" on product_services;
create policy "product services read company" on product_services
for select
using (company_id = public.current_company_id());

drop policy if exists "product services manage managers" on product_services;
create policy "product services manage managers" on product_services
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "company onboarding read managers" on company_onboarding;
create policy "company onboarding read managers" on company_onboarding
for select
using (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "company onboarding manage managers" on company_onboarding;
create policy "company onboarding manage managers" on company_onboarding
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "onboarding events read managers" on onboarding_events;
create policy "onboarding events read managers" on onboarding_events
for select
using (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "onboarding events manage managers" on onboarding_events;
create policy "onboarding events manage managers" on onboarding_events
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

create index if not exists idx_product_services_company_status on product_services(company_id, status, category);
create index if not exists idx_company_onboarding_company on company_onboarding(company_id);
create index if not exists idx_onboarding_events_company on onboarding_events(company_id, created_at desc);

insert into product_services (company_id, name, category, description, price, billing_type, status)
select c.id, 'CRM Comercial', 'Software', 'Implantação e uso do CRM para gestão comercial, atendimento e automações.', 497.00, 'Mensal', 'Ativo'
from companies c
where not exists (select 1 from product_services ps where ps.company_id = c.id and ps.name = 'CRM Comercial');

insert into product_services (company_id, name, category, description, price, billing_type, status)
select c.id, 'Consultoria Comercial', 'Serviço', 'Diagnóstico, funil, scripts, indicadores e melhoria do processo de vendas.', 1500.00, 'Projeto', 'Ativo'
from companies c
where not exists (select 1 from product_services ps where ps.company_id = c.id and ps.name = 'Consultoria Comercial');

insert into company_onboarding (company_id, created_by)
select c.id, null
from companies c
where not exists (select 1 from company_onboarding co where co.company_id = c.id);
