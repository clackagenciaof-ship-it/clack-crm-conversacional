-- CLACK CRM Conversacional — Fase 10.4 e 10.5: sequências de fluxo e disparos segmentados
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 016.

create table if not exists chatbot_flow_sessions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  flow_id uuid not null references chatbot_flows(id) on delete cascade,
  conversation_id uuid not null references whatsapp_conversations(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  status text not null default 'running',
  current_position integer not null default 0,
  started_by uuid references profiles(id) on delete set null,
  last_step_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_flow_session_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  session_id uuid not null references chatbot_flow_sessions(id) on delete cascade,
  flow_id uuid references chatbot_flows(id) on delete set null,
  step_id uuid references chatbot_flow_steps(id) on delete set null,
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  step_position integer,
  action_type text not null default 'message',
  message text,
  status text not null default 'executed',
  result text,
  created_at timestamptz not null default now()
);

create table if not exists message_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  segment_type text not null default 'lead_quente',
  channel text not null default 'WhatsApp',
  message text not null,
  status text not null default 'draft',
  total_recipients integer not null default 0,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists message_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  campaign_id uuid not null references message_campaigns(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  phone text,
  name text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

alter table chatbot_flow_sessions enable row level security;
alter table chatbot_flow_session_events enable row level security;
alter table message_campaigns enable row level security;
alter table message_campaign_recipients enable row level security;

drop policy if exists "flow sessions read company" on chatbot_flow_sessions;
create policy "flow sessions read company" on chatbot_flow_sessions
for select
using (company_id = public.current_company_id());

drop policy if exists "flow sessions manage attendants" on chatbot_flow_sessions;
create policy "flow sessions manage attendants" on chatbot_flow_sessions
for all
using (
  company_id = public.current_company_id()
  and (public.current_profile_is_manager() or public.current_profile_is_attendant() or started_by = auth.uid())
)
with check (
  company_id = public.current_company_id()
  and (public.current_profile_is_manager() or public.current_profile_is_attendant() or started_by = auth.uid())
);

drop policy if exists "flow session events read company" on chatbot_flow_session_events;
create policy "flow session events read company" on chatbot_flow_session_events
for select
using (company_id = public.current_company_id());

drop policy if exists "flow session events manage attendants" on chatbot_flow_session_events;
create policy "flow session events manage attendants" on chatbot_flow_session_events
for all
using (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_attendant()))
with check (company_id = public.current_company_id() and (public.current_profile_is_manager() or public.current_profile_is_attendant()));

drop policy if exists "campaigns read company" on message_campaigns;
create policy "campaigns read company" on message_campaigns
for select
using (company_id = public.current_company_id());

drop policy if exists "campaigns manage managers" on message_campaigns;
create policy "campaigns manage managers" on message_campaigns
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

drop policy if exists "campaign recipients read company" on message_campaign_recipients;
create policy "campaign recipients read company" on message_campaign_recipients
for select
using (company_id = public.current_company_id());

drop policy if exists "campaign recipients manage managers" on message_campaign_recipients;
create policy "campaign recipients manage managers" on message_campaign_recipients
for all
using (company_id = public.current_company_id() and public.current_profile_is_manager())
with check (company_id = public.current_company_id() and public.current_profile_is_manager());

create index if not exists idx_flow_sessions_company_conversation on chatbot_flow_sessions(company_id, conversation_id, status);
create index if not exists idx_flow_session_events_session on chatbot_flow_session_events(session_id, created_at desc);
create index if not exists idx_message_campaigns_company_status on message_campaigns(company_id, status, created_at desc);
create index if not exists idx_campaign_recipients_campaign on message_campaign_recipients(campaign_id, status);
