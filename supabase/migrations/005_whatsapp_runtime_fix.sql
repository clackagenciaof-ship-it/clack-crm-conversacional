-- CLACK CRM Conversacional — correção runtime do WhatsApp Cloud API
-- Esta migration completa as colunas/tabelas usadas pelo processador do webhook em produção.
-- Execute uma vez no SQL Editor do Supabase após a migration 004.

alter table if exists public.whatsapp_conversations
  add column if not exists priority text not null default 'Normal',
  add column if not exists channel text not null default 'WhatsApp';

alter table if exists public.whatsapp_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz,
  add column if not exists error_code text,
  add column if not exists error_message text;

create table if not exists public.whatsapp_status_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_message_id text,
  status text not null,
  recipient_phone text,
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_status_events_company on public.whatsapp_status_events(company_id);
create index if not exists idx_whatsapp_status_events_provider on public.whatsapp_status_events(provider_message_id);
create index if not exists idx_whatsapp_status_events_created on public.whatsapp_status_events(created_at desc);

create index if not exists idx_whatsapp_accounts_phone_number_id on public.whatsapp_accounts(phone_number_id);
create index if not exists idx_whatsapp_accounts_business_account_id on public.whatsapp_accounts(business_account_id);
create index if not exists idx_whatsapp_conversations_customer_phone on public.whatsapp_conversations(company_id, customer_phone);
create index if not exists idx_whatsapp_messages_provider_message_id on public.whatsapp_messages(company_id, provider_message_id);

alter table public.whatsapp_status_events enable row level security;

drop policy if exists "company whatsapp status events" on public.whatsapp_status_events;

create policy "company whatsapp status events" on public.whatsapp_status_events
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

-- Permite que usuários autenticados vejam eventos do webhook já vinculados à empresa.
-- Inserts continuam acontecendo pelo service role no endpoint da Vercel.
drop policy if exists "company whatsapp webhook events" on public.whatsapp_webhook_events;
create policy "company whatsapp webhook events" on public.whatsapp_webhook_events
for select
to authenticated
using (company_id = public.current_company_id());
