-- CLACK CRM Conversacional — segurança profunda por perfil
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 007.

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(role, '')
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

grant execute on function public.current_profile_role() to authenticated;

drop policy if exists "company data read contacts" on contacts;
drop policy if exists "company data write contacts" on contacts;
drop policy if exists "company data read opportunities" on opportunities;
drop policy if exists "company data write opportunities" on opportunities;
drop policy if exists "company data tasks" on tasks;
drop policy if exists "company data messages" on quick_messages;
drop policy if exists "company data logs" on activity_logs;

create policy "role data read contacts" on contacts
for select
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
    or lower(public.current_profile_role()) like '%financeiro%'
    or owner_id = auth.uid()
  )
);

create policy "role data write contacts" on contacts
for all
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
    or owner_id = auth.uid()
  )
)
with check (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
    or owner_id = auth.uid()
  )
);

create policy "role data read opportunities" on opportunities
for select
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%financeiro%'
    or owner_id = auth.uid()
  )
);

create policy "role data write opportunities" on opportunities
for all
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or owner_id = auth.uid()
  )
)
with check (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or owner_id = auth.uid()
  )
);

create policy "role data tasks" on tasks
for all
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
    or owner_id = auth.uid()
  )
)
with check (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
    or owner_id = auth.uid()
  )
);

create policy "role data messages" on quick_messages
for all
using (
  company_id = public.current_company_id()
)
with check (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or lower(public.current_profile_role()) like '%atendente%'
  )
);

create policy "role data logs" on activity_logs
for all
using (
  company_id = public.current_company_id()
  and (
    lower(public.current_profile_role()) like '%admin%'
    or lower(public.current_profile_role()) like '%gestor%'
    or user_id = auth.uid()
  )
)
with check (
  company_id = public.current_company_id()
);
