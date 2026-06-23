-- CLACK CRM Conversacional — Fase 5: RLS e segurança completa por perfil
-- Execute este arquivo uma vez no SQL Editor do Supabase.

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

create or replace function public.current_profile_is_manager()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(public.current_profile_role()) like '%admin%'
      or lower(public.current_profile_role()) like '%gestor%';
$$;

create or replace function public.current_profile_is_finance()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(public.current_profile_role()) like '%financeiro%';
$$;

create or replace function public.current_profile_is_attendant()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select lower(public.current_profile_role()) like '%atendente%';
$$;

grant execute on function public.current_profile_role() to authenticated;
grant execute on function public.current_profile_is_manager() to authenticated;
grant execute on function public.current_profile_is_finance() to authenticated;
grant execute on function public.current_profile_is_attendant() to authenticated;

-- Garante dono padrão quando um usuário cria registros pelo app.
create or replace function public.set_default_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is null then
    new.owner_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contacts_default_owner on public.contacts;
create trigger trg_contacts_default_owner
before insert on public.contacts
for each row
execute function public.set_default_owner_id();

drop trigger if exists trg_opportunities_default_owner on public.opportunities;
create trigger trg_opportunities_default_owner
before insert on public.opportunities
for each row
execute function public.set_default_owner_id();

drop trigger if exists trg_tasks_default_owner on public.tasks;
create trigger trg_tasks_default_owner
before insert on public.tasks
for each row
execute function public.set_default_owner_id();

-- Perfis: Admin/Gestor veem equipe da empresa; usuário sempre vê a si mesmo.
alter table profiles enable row level security;
drop policy if exists "profiles select by company role" on profiles;
drop policy if exists "profiles self select" on profiles;
create policy "profiles select by company role" on profiles
for select
using (
  id = auth.uid()
  or (
    company_id = public.current_company_id()
    and public.current_profile_is_manager()
  )
);

-- WhatsApp/Atendimento com controle por empresa e perfil.
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;

drop policy if exists "company whatsapp conversations" on whatsapp_conversations;
drop policy if exists "company whatsapp messages" on whatsapp_messages;
drop policy if exists "role whatsapp conversations read" on whatsapp_conversations;
drop policy if exists "role whatsapp conversations write" on whatsapp_conversations;
drop policy if exists "role whatsapp messages read" on whatsapp_messages;
drop policy if exists "role whatsapp messages write" on whatsapp_messages;

create policy "role whatsapp conversations read" on whatsapp_conversations
for select
using (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
    or contact_id in (select id from public.contacts where owner_id = auth.uid())
  )
);

create policy "role whatsapp conversations write" on whatsapp_conversations
for all
using (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
    or contact_id in (select id from public.contacts where owner_id = auth.uid())
  )
)
with check (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
    or contact_id in (select id from public.contacts where owner_id = auth.uid())
  )
);

create policy "role whatsapp messages read" on whatsapp_messages
for select
using (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
    or contact_id in (select id from public.contacts where owner_id = auth.uid())
  )
);

create policy "role whatsapp messages write" on whatsapp_messages
for all
using (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
    or contact_id in (select id from public.contacts where owner_id = auth.uid())
  )
)
with check (
  company_id = public.current_company_id()
);

-- Financeiro não escreve leads/tarefas/mensagens rápidas; apenas lê indicadores/vendas pelas policies anteriores.
