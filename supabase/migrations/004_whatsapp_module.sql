-- CLACK CRM Conversacional — base do módulo WhatsApp Cloud API
-- Execute este arquivo uma vez no SQL Editor do Supabase quando formos iniciar a Fase 3.

create table if not exists whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  phone_number_id text not null,
  display_phone_number text,
  business_account_id text,
  status text not null default 'Ativa',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  customer_phone text not null,
  customer_name text,
  status text not null default 'Aberta',
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  direction text not null check (direction in ('inbound', 'outbound')),
  provider_message_id text,
  from_phone text,
  to_phone text,
  message_type text not null default 'text',
  body text,
  status text not null default 'received',
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  event_type text not null default 'whatsapp_webhook',
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_accounts_company on whatsapp_accounts(company_id);
create index if not exists idx_whatsapp_conversations_company on whatsapp_conversations(company_id);
create index if not exists idx_whatsapp_messages_company on whatsapp_messages(company_id);
create index if not exists idx_whatsapp_messages_conversation on whatsapp_messages(conversation_id);
create index if not exists idx_whatsapp_webhook_events_created on whatsapp_webhook_events(created_at desc);

alter table whatsapp_accounts enable row level security;
alter table whatsapp_conversations enable row level security;
alter table whatsapp_messages enable row level security;
alter table whatsapp_webhook_events enable row level security;

drop policy if exists "company whatsapp accounts" on whatsapp_accounts;
drop policy if exists "company whatsapp conversations" on whatsapp_conversations;
drop policy if exists "company whatsapp messages" on whatsapp_messages;
drop policy if exists "company whatsapp webhook events" on whatsapp_webhook_events;

create policy "company whatsapp accounts" on whatsapp_accounts
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "company whatsapp conversations" on whatsapp_conversations
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "company whatsapp messages" on whatsapp_messages
for all
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());

create policy "company whatsapp webhook events" on whatsapp_webhook_events
for select
using (company_id = public.current_company_id());
