-- CLACK CRM Conversacional — acesso a empresas e auditoria administrativa
-- Execute este arquivo uma vez no SQL Editor do Supabase.

alter table companies enable row level security;

create table if not exists company_plan_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);

alter table company_plan_audit_logs enable row level security;

drop policy if exists "company select own company" on companies;
drop policy if exists "company audit select own company" on company_plan_audit_logs;

create policy "company select own company" on companies
for select
using (id = public.current_company_id());

create policy "company audit select own company" on company_plan_audit_logs
for select
using (company_id = public.current_company_id());

create index if not exists idx_company_plan_audit_company_created
on company_plan_audit_logs(company_id, created_at desc);
