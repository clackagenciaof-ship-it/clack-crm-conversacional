-- CLACK CRM Conversacional — Fase 7 + Fase 11
-- Mensagens oficiais com consentimento + Financeiro operacional
-- Execute uma vez no SQL Editor do Supabase após a migration 017.

alter table contacts
add column if not exists whatsapp_opt_in boolean not null default true,
add column if not exists opt_in_source text,
add column if not exists opt_in_at timestamptz default now();

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  meta_template_name text not null,
  language text not null default 'pt_BR',
  category text not null default 'utility',
  body text not null,
  status text not null default 'approved',
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, meta_template_name, language)
);

alter table message_campaigns
add column if not exists template_id uuid references whatsapp_templates(id) on delete set null,
add column if not exists scheduled_at timestamptz,
add column if not exists executed_at timestamptz,
add column if not exists sent_count integer not null default 0,
add column if not exists failed_count integer not null default 0,
add column if not exists queued_count integer not null default 0;

alter table message_campaign_recipients
add column if not exists provider_message_id text,
add column if not exists sent_at timestamptz,
add column if not exists error_message text;

create table if not exists finance_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  opportunity_id uuid references opportunities(id) on delete set null,
  customer_name text not null,
  description text not null,
  amount numeric(12,2) not null default 0,
  status text not null default 'Pendente',
  due_at date,
  paid_at date,
  payment_method text,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  invoice_id uuid references finance_invoices(id) on delete cascade,
  entry_type text not null default 'income',
  description text not null,
  amount numeric(12,2) not null default 0,
  occurred_at date not null default current_date,
  payment_method text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table whatsapp_templates enable row level security;
alter table finance_invoices enable row level security;
alter table finance_entries enable row level security;

drop policy if exists "templates read company" on whatsapp_templates;
create policy "templates read company" on whatsapp_templates for select using (company_id = public.current_company_id());

drop policy if exists "templates manage managers" on whatsapp_templates;
create policy "templates manage managers" on whatsapp_templates for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "finance invoices read company" on finance_invoices;
create policy "finance invoices read company" on finance_invoices for select
using (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()));

drop policy if exists "finance invoices manage company" on finance_invoices;
create policy "finance invoices manage company" on finance_invoices for all
using (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()))
with check (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()));

drop policy if exists "finance entries read company" on finance_entries;
create policy "finance entries read company" on finance_entries for select
using (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()));

drop policy if exists "finance entries manage company" on finance_entries;
create policy "finance entries manage company" on finance_entries for all
using (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()))
with check (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_finance()));

create index if not exists idx_whatsapp_templates_company on whatsapp_templates(company_id, active, status);
create index if not exists idx_campaign_recipients_status on message_campaign_recipients(company_id, campaign_id, status);
create index if not exists idx_finance_invoices_company_status on finance_invoices(company_id, status, due_at);
create index if not exists idx_finance_entries_company_date on finance_entries(company_id, occurred_at desc);
