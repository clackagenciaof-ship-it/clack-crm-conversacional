-- CLACK ONE Ops v2
-- Consolida CRM real, ONE Core operacional e Público 360 com estatísticas territoriais agregadas.

alter table public_territories add column if not exists electorate_total bigint;
alter table public_territories add column if not exists latitude numeric;
alter table public_territories add column if not exists longitude numeric;
alter table public_territories add column if not exists region_code text;

create table if not exists public_leaders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  territory_id uuid references public_territories(id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  neighborhood text,
  city text not null,
  state text not null,
  status text not null default 'Ativa' check (status in ('Ativa','Inativa')),
  target_contacts integer not null default 0 check (target_contacts >= 0),
  notes text,
  consent_status boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public_contacts add column if not exists address text;
alter table public_contacts add column if not exists postal_code text;
alter table public_contacts add column if not exists latitude numeric;
alter table public_contacts add column if not exists longitude numeric;
alter table public_contacts add column if not exists contact_type text not null default 'Contato';
alter table public_contacts add column if not exists leader_id uuid references public_leaders(id) on delete set null;

alter table public_requests add column if not exists priority text not null default 'Média';
alter table public_requests add column if not exists updated_at timestamptz not null default now();

alter table public_events add column if not exists ends_at timestamptz;
alter table public_events add column if not exists status text not null default 'Planejado';
alter table public_events add column if not exists confirmed_count integer not null default 0;
alter table public_events add column if not exists updated_at timestamptz not null default now();

create table if not exists public_agenda (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  category text not null default 'Compromisso',
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  city text,
  state text,
  responsible text,
  status text not null default 'Agendado',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public_assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  asset_type text not null default 'Veículo',
  name text not null,
  identifier text,
  city text,
  state text,
  responsible text,
  status text not null default 'Disponível',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public_electorate_stats (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  territory_id uuid references public_territories(id) on delete set null,
  state text not null,
  city text not null,
  neighborhood text,
  electorate_total bigint not null check (electorate_total >= 0),
  source_name text,
  source_date date,
  created_at timestamptz not null default now(),
  unique(company_id,state,city,neighborhood,source_date)
);

create table if not exists public_simulations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  electorate_total bigint not null check (electorate_total >= 0),
  turnout_rate numeric not null default 80 check (turnout_rate between 0 and 100),
  valid_vote_rate numeric not null default 90 check (valid_vote_rate between 0 and 100),
  reference_share numeric not null default 10 check (reference_share between 0 and 100),
  projected_turnout bigint not null default 0,
  projected_valid bigint not null default 0,
  projected_reference bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public_ops_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_leaders_company_city on public_leaders(company_id,state,city);
create index if not exists idx_public_contacts_leader on public_contacts(company_id,leader_id);
create index if not exists idx_public_agenda_company_start on public_agenda(company_id,starts_at);
create index if not exists idx_public_assets_company_status on public_assets(company_id,status);
create index if not exists idx_public_electorate_company_city on public_electorate_stats(company_id,state,city);
create index if not exists idx_public_audit_company_created on public_ops_audit_logs(company_id,created_at desc);

alter table public_leaders enable row level security;
alter table public_agenda enable row level security;
alter table public_assets enable row level security;
alter table public_electorate_stats enable row level security;
alter table public_simulations enable row level security;
alter table public_ops_audit_logs enable row level security;

drop policy if exists "company public leaders" on public_leaders;
create policy "company public leaders" on public_leaders for all
using (company_id = (select company_id from profiles where id = auth.uid()))
with check (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public agenda" on public_agenda;
create policy "company public agenda" on public_agenda for all
using (company_id = (select company_id from profiles where id = auth.uid()))
with check (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public assets" on public_assets;
create policy "company public assets" on public_assets for all
using (company_id = (select company_id from profiles where id = auth.uid()))
with check (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public electorate" on public_electorate_stats;
create policy "company public electorate" on public_electorate_stats for all
using (company_id = (select company_id from profiles where id = auth.uid()))
with check (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public simulations" on public_simulations;
create policy "company public simulations" on public_simulations for all
using (company_id = (select company_id from profiles where id = auth.uid()))
with check (company_id = (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public audit read" on public_ops_audit_logs;
create policy "company public audit read" on public_ops_audit_logs for select
using (company_id = (select company_id from profiles where id = auth.uid()));

create or replace function log_public_ops_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_id uuid;
begin
  v_company := coalesce(new.company_id, old.company_id);
  v_id := coalesce(new.id, old.id);
  insert into public_ops_audit_logs(company_id,actor_profile_id,entity_type,entity_id,action,metadata)
  values(v_company,auth.uid(),tg_table_name,v_id,tg_op,jsonb_build_object('source','Público 360'));
  if TG_OP = 'DELETE' then
    return old;
  end if;
  return new;
end;
$;

do $$
declare tab text;
begin
  foreach tab in array array['public_territories','public_contacts','public_leaders','public_requests','public_events','public_agenda','public_assets','public_electorate_stats','public_notices','public_simulations']
  loop
    execute format('drop trigger if exists trg_%I_audit on %I',tab,tab);
    execute format('create trigger trg_%I_audit after insert or update or delete on %I for each row execute function log_public_ops_change()',tab,tab);
  end loop;
end $$;

comment on table public_electorate_stats is 'Estatísticas eleitorais públicas agregadas por território. Não representa preferência individual.';
comment on table public_contacts is 'Contatos para relacionamento e atendimento. Não armazenar intenção de voto ou preferência política.';
comment on table public_simulations is 'Simulações matemáticas agregadas, sem perfil individual ou microtargeting.';

-- Limpeza segura de registros de demonstração que estavam misturados ao tenant real da Clack.
do $$
declare
  v_company uuid := 'f0eebc0a-0dca-4420-9e1f-b0b1b2e7b6c6';
  demo_contacts uuid[];
  test_conversations uuid[];
begin
  select array_agg(id) into demo_contacts
  from contacts
  where company_id=v_company
    and created_at='2026-06-18T09:55:26.152594+00:00'::timestamptz
    and name = any(array['Ana Clara','Isabela Costa','Marcos Oliveira','Fernanda Lima','Rafael Santos']);

  if demo_contacts is not null then
    delete from message_campaign_recipients where company_id=v_company and contact_id=any(demo_contacts);
    delete from whatsapp_messages where company_id=v_company and contact_id=any(demo_contacts);
    delete from activity_logs where company_id=v_company and contact_id=any(demo_contacts);
    delete from tasks where company_id=v_company and contact_id=any(demo_contacts);
    delete from finance_invoices where company_id=v_company and contact_id=any(demo_contacts);
    delete from opportunities where company_id=v_company and contact_id=any(demo_contacts);
    delete from contacts where company_id=v_company and id=any(demo_contacts);
  end if;

  delete from quick_messages
  where company_id=v_company
    and created_at='2026-06-18T09:55:26.152594+00:00'::timestamptz
    and title = any(array['Boas-vindas','Qualificação','Retorno de proposta','Fechamento']);

  select array_agg(id) into test_conversations
  from whatsapp_conversations
  where company_id=v_company and contact_id is null
    and (lower(coalesce(customer_name,'')) like '%teste%' or lower(coalesce(customer_name,''))='test user name');

  if test_conversations is not null then
    delete from atendimento_audit_logs where company_id=v_company and conversation_id=any(test_conversations);
    delete from whatsapp_messages where company_id=v_company and conversation_id=any(test_conversations);
    delete from whatsapp_conversations where company_id=v_company and id=any(test_conversations);
  end if;

  delete from tasks t
  using (
    select id,row_number() over(partition by company_id,contact_id,title,status order by created_at desc) rn
    from tasks
    where company_id=v_company and title like 'Follow-up automático:%'
  ) d
  where t.id=d.id and d.rn>1;
end $$;
