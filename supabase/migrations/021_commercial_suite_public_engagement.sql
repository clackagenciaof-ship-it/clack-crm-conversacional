-- CLACK Commercial Suite — ONE Intelligence + Relacionamento Público
-- Dados territoriais são agregados e o módulo não registra preferência política individual.

create table if not exists public_territories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  state text not null,
  city text not null,
  territory_name text,
  population_total bigint check (population_total is null or population_total >= 0),
  source_name text,
  source_date date,
  created_at timestamptz not null default now(),
  unique(company_id, state, city, territory_name)
);

create table if not exists public_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  city text not null,
  state text not null,
  neighborhood text,
  consent_status boolean not null default false,
  consent_channel text,
  created_at timestamptz not null default now(),
  constraint public_contacts_consent_channel check (consent_status = false or consent_channel is not null)
);

create table if not exists public_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references public_contacts(id) on delete set null,
  category text not null,
  title text not null,
  description text,
  status text not null default 'aberta' check (status in ('aberta','em_andamento','resolvida','arquivada')),
  assigned_to uuid references profiles(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  city text not null,
  state text not null,
  venue text,
  starts_at timestamptz,
  purpose text not null default 'escuta' check (purpose in ('escuta','servico','evento_publico')),
  created_at timestamptz not null default now()
);

create table if not exists public_notices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  body text not null,
  purpose text not null check (purpose in ('servico','evento','informacao_publica')),
  city text,
  state text,
  status text not null default 'rascunho' check (status in ('rascunho','aprovado','enviado','cancelado')),
  created_at timestamptz not null default now()
);

create index if not exists idx_public_territories_company_city on public_territories(company_id, state, city);
create index if not exists idx_public_contacts_company_city on public_contacts(company_id, state, city);
create index if not exists idx_public_contacts_company_consent on public_contacts(company_id, consent_status);
create index if not exists idx_public_requests_company_status on public_requests(company_id, status);
create index if not exists idx_public_notices_company_status on public_notices(company_id, status);

alter table public_territories enable row level security;
alter table public_contacts enable row level security;
alter table public_requests enable row level security;
alter table public_events enable row level security;
alter table public_notices enable row level security;

drop policy if exists "company public territories" on public_territories;
create policy "company public territories" on public_territories for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public contacts" on public_contacts;
create policy "company public contacts" on public_contacts for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public requests" on public_requests;
create policy "company public requests" on public_requests for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public events" on public_events;
create policy "company public events" on public_events for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public notices" on public_notices;
create policy "company public notices" on public_notices for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

comment on table public_territories is 'Estatísticas territoriais agregadas para cobertura e capacidade de atendimento.';
comment on table public_contacts is 'Relacionamento público com consentimento de comunicação quando aplicável.';
comment on table public_notices is 'Comunicações limitadas a serviço, evento e informação pública.';
