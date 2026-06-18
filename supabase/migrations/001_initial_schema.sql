-- CLACK CRM Conversacional — estrutura inicial para Supabase
-- Execute este arquivo no SQL Editor do Supabase quando for conectar backend real.

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  email text,
  phone text,
  city text,
  state text,
  segment text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'vendedor',
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists lead_origins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  status text not null default 'active'
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  owner_id uuid references profiles(id),
  name text not null,
  phone text not null,
  email text,
  city text,
  state text,
  origin text,
  temperature text not null default 'Morno',
  status text not null default 'Lead',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, phone)
);

create table if not exists pipelines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  status text not null default 'active'
);

create table if not exists pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  pipeline_id uuid not null references pipelines(id) on delete cascade,
  name text not null,
  position int not null,
  status text not null default 'active'
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  pipeline_id uuid references pipelines(id),
  stage_id uuid references pipeline_stages(id),
  owner_id uuid references profiles(id),
  title text not null,
  value numeric(12,2) not null default 0,
  temperature text not null default 'Morno',
  status text not null default 'Aberta',
  expected_close_date date,
  product_interest text,
  lost_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  owner_id uuid references profiles(id),
  title text not null,
  description text,
  type text not null default 'Ligar',
  priority text not null default 'Média',
  due_at timestamptz,
  status text not null default 'Pendente',
  created_at timestamptz not null default now()
);

create table if not exists quick_messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  category text not null,
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete cascade,
  user_id uuid references profiles(id),
  type text not null,
  description text not null,
  created_at timestamptz not null default now()
);

alter table companies enable row level security;
alter table profiles enable row level security;
alter table contacts enable row level security;
alter table opportunities enable row level security;
alter table tasks enable row level security;
alter table quick_messages enable row level security;
alter table activity_logs enable row level security;

create policy "profiles can read own company" on profiles for select using (
  id = auth.uid() or company_id in (select company_id from profiles where id = auth.uid())
);

create policy "company data read contacts" on contacts for select using (
  company_id in (select company_id from profiles where id = auth.uid())
);
create policy "company data write contacts" on contacts for all using (
  company_id in (select company_id from profiles where id = auth.uid())
) with check (
  company_id in (select company_id from profiles where id = auth.uid())
);

create policy "company data read opportunities" on opportunities for select using (
  company_id in (select company_id from profiles where id = auth.uid())
);
create policy "company data write opportunities" on opportunities for all using (
  company_id in (select company_id from profiles where id = auth.uid())
) with check (
  company_id in (select company_id from profiles where id = auth.uid())
);

create policy "company data tasks" on tasks for all using (
  company_id in (select company_id from profiles where id = auth.uid())
) with check (
  company_id in (select company_id from profiles where id = auth.uid())
);

create policy "company data messages" on quick_messages for all using (
  company_id in (select company_id from profiles where id = auth.uid())
) with check (
  company_id in (select company_id from profiles where id = auth.uid())
);

create policy "company data logs" on activity_logs for all using (
  company_id in (select company_id from profiles where id = auth.uid())
) with check (
  company_id in (select company_id from profiles where id = auth.uid())
);
