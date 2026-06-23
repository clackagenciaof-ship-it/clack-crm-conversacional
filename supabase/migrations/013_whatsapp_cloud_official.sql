-- CLACK CRM Conversacional — Fase 7: WhatsApp Cloud API oficial
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 012.

alter table whatsapp_accounts
add column if not exists graph_api_version text not null default 'v20.0',
add column if not exists quality_rating text,
add column if not exists messaging_limit_tier text,
add column if not exists last_verified_at timestamptz;

alter table whatsapp_messages
add column if not exists error_code text,
add column if not exists error_message text,
add column if not exists delivered_at timestamptz,
add column if not exists read_at timestamptz;

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  language text not null default 'pt_BR',
  category text not null default 'MARKETING',
  status text not null default 'Pendente',
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_status_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  provider_message_id text,
  status text not null,
  recipient_phone text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table whatsapp_templates enable row level security;
alter table whatsapp_status_events enable row level security;

drop policy if exists "whatsapp templates by company" on whatsapp_templates;
create policy "whatsapp templates by company" on whatsapp_templates
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

drop policy if exists "whatsapp status read by company" on whatsapp_status_events;
create policy "whatsapp status read by company" on whatsapp_status_events
for select
using (company_id = public.current_company_id());

create index if not exists idx_whatsapp_templates_company_active on whatsapp_templates(company_id, active, status);
create index if not exists idx_whatsapp_messages_provider_message_id on whatsapp_messages(provider_message_id);
create index if not exists idx_whatsapp_status_events_provider on whatsapp_status_events(provider_message_id, created_at desc);
