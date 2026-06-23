-- CLACK CRM Conversacional — planos e limite de usuários por empresa
-- Execute este arquivo uma vez no SQL Editor do Supabase antes de testar a criação real de usuários.

alter table companies
add column if not exists plan_name text not null default 'Inicial',
add column if not exists user_limit integer not null default 5,
add column if not exists billing_status text not null default 'active';

update companies
set plan_name = coalesce(plan_name, 'Inicial'),
    user_limit = coalesce(user_limit, 5),
    billing_status = coalesce(billing_status, 'active');

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

drop policy if exists "company plan audit logs select" on company_plan_audit_logs;

create policy "company plan audit logs select" on company_plan_audit_logs
for select
using (company_id = public.current_company_id());
