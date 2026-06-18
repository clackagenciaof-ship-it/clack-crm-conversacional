-- CLACK CRM Conversacional — correção das políticas RLS
-- Execute este arquivo no SQL Editor do Supabase se o app mostrar fallback mesmo após login real.

create or replace function public.current_company_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_company_id() to authenticated;
grant execute on function public.current_company_id() to anon;

-- Recria políticas evitando subqueries diretas em profiles dentro das próprias policies.
drop policy if exists "profiles can read own company" on profiles;
drop policy if exists "company data read contacts" on contacts;
drop policy if exists "company data write contacts" on contacts;
drop policy if exists "company data read opportunities" on opportunities;
drop policy if exists "company data write opportunities" on opportunities;
drop policy if exists "company data tasks" on tasks;
drop policy if exists "company data messages" on quick_messages;
drop policy if exists "company data logs" on activity_logs;

create policy "profiles can read own company" on profiles
for select
using (
  id = auth.uid()
  or company_id = public.current_company_id()
);

create policy "company data read contacts" on contacts
for select
using (
  company_id = public.current_company_id()
);

create policy "company data write contacts" on contacts
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
);

create policy "company data read opportunities" on opportunities
for select
using (
  company_id = public.current_company_id()
);

create policy "company data write opportunities" on opportunities
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
);

create policy "company data tasks" on tasks
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
);

create policy "company data messages" on quick_messages
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
);

create policy "company data logs" on activity_logs
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
);
