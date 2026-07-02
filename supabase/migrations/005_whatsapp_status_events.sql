-- CLACK CRM Conversacional — eventos de status do WhatsApp Cloud API
-- Complementa o módulo WhatsApp para registrar enviado/entregue/lido/falha.

alter table public.whatsapp_messages
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

alter table public.whatsapp_status_events enable row level security;

drop policy if exists "company whatsapp status events" on public.whatsapp_status_events;

create policy "company whatsapp status events" on public.whatsapp_status_events
for all
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());
