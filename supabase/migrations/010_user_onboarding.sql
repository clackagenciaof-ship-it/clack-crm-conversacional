-- CLACK CRM Conversacional — convite, senha e onboarding de usuários
-- Execute este arquivo uma vez no SQL Editor do Supabase.

alter table profiles
add column if not exists invite_status text not null default 'active',
add column if not exists last_invited_at timestamptz,
add column if not exists temporary_password_updated_at timestamptz;

update profiles
set invite_status = coalesce(invite_status, 'active');

create index if not exists idx_profiles_company_invite_status
on profiles(company_id, invite_status);
