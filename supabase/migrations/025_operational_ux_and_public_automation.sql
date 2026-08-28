-- CLACK ONE: operational heartbeats + safe public information automations.
create extension if not exists pg_net;

create table if not exists system_internal_settings (
  key text primary key,
  secret text not null,
  updated_at timestamptz not null default now()
);
alter table system_internal_settings enable row level security;

insert into system_internal_settings(key,secret)
values ('public_message_cron_secret', replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''))
on conflict (key) do nothing;

create table if not exists system_job_heartbeat (
  job_name text primary key,
  last_run_at timestamptz not null default now(),
  status text not null default 'ok',
  details jsonb not null default '{}'::jsonb
);
alter table system_job_heartbeat enable row level security;

create table if not exists public_message_automations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  purpose text not null check (purpose in ('servico','evento','informacao_publica')),
  audience_type text not null default 'all_consented' check (audience_type in ('all_consented','city','state')),
  city text,
  state text,
  message text not null,
  frequency text not null default 'once' check (frequency in ('once','daily','weekly')),
  next_run_at timestamptz not null,
  last_run_at timestamptz,
  active boolean not null default true,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public_message_automation_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  automation_id uuid not null references public_message_automations(id) on delete cascade,
  scheduled_for timestamptz,
  audience_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  status text not null default 'started' check (status in ('started','completed','failed','skipped')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_message_automations_due
  on public_message_automations(active,next_run_at);
create index if not exists idx_public_message_runs_company
  on public_message_automation_runs(company_id,created_at desc);

alter table public_message_automations enable row level security;
alter table public_message_automation_runs enable row level security;

drop policy if exists "company public message automations" on public_message_automations;
create policy "company public message automations" on public_message_automations for all
using (company_id in (select company_id from profiles where id = auth.uid()))
with check (company_id in (select company_id from profiles where id = auth.uid()));

drop policy if exists "company public message automation runs" on public_message_automation_runs;
create policy "company public message automation runs" on public_message_automation_runs for select
using (company_id in (select company_id from profiles where id = auth.uid()));

-- Track the commercial automation scheduler itself, even when there are no targets.
create or replace function public.run_clack_automation_rules()
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  r record;
  c record;
  o record;
  w record;
  v_owner uuid;
  v_executed integer := 0;
  v_skipped integer := 0;
  v_delay interval;
begin
  for r in
    select *
    from automation_rules
    where active=true and action_type='create_task'
    order by company_id, created_at
  loop
    select p.id into v_owner
    from profiles p
    where p.company_id=r.company_id and p.status='active'
    order by case lower(p.role)
      when 'admin empresa' then 1 when 'admin' then 1 when 'gestor' then 2
      when 'vendedor' then 3 when 'atendente' then 4 else 9 end,
      p.created_at
    limit 1;

    v_delay := make_interval(mins => greatest(coalesce(r.delay_minutes,0),0));

    if r.trigger_type='lead_hot_idle' then
      for c in
        select id,name,owner_id,updated_at
        from contacts
        where company_id=r.company_id and temperature='Quente' and status<>'Arquivado'
          and updated_at <= now()-v_delay
        order by updated_at limit 100
      loop
        if exists(select 1 from automation_runs where automation_rule_id=r.id and target_type='contact'
          and target_id=c.id and created_at >= now()-interval '24 hours') then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,owner_id,title,description,type,priority,due_at,status)
          values(r.company_id,c.id,coalesce(c.owner_id,v_owner),'Follow-up automático: '||c.name,
            coalesce(r.message,'Fazer follow-up e registrar retorno no CRM.'),
            coalesce(r.config->>'task_type','Follow-up'),coalesce(r.config->>'priority','Alta'),now(),'Pendente');
          insert into automation_runs(company_id,automation_rule_id,target_type,target_id,status,result)
          values(r.company_id,r.id,'contact',c.id,'executed','Tarefa criada automaticamente para lead quente '||c.name);
          v_executed := v_executed+1;
        end if;
      end loop;
    end if;

    if r.trigger_type='opportunity_stage_idle' then
      for o in
        select id,contact_id,owner_id,title,stage_name,updated_at
        from opportunities
        where company_id=r.company_id and status='Aberta'
          and stage_name=coalesce(nullif(r.stage_name,''),'Proposta Enviada')
          and updated_at <= now()-v_delay
        order by updated_at limit 100
      loop
        if exists(select 1 from automation_runs where automation_rule_id=r.id and target_type='opportunity'
          and target_id=o.id and created_at >= now()-interval '24 hours') then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,opportunity_id,owner_id,title,description,type,priority,due_at,status)
          values(r.company_id,o.contact_id,o.id,coalesce(o.owner_id,v_owner),'Retomar oportunidade: '||o.title,
            coalesce(r.message,'Retomar oportunidade e conduzir ao próximo passo.'),
            coalesce(r.config->>'task_type','Comercial'),coalesce(r.config->>'priority','Média'),now(),'Pendente');
          insert into automation_runs(company_id,automation_rule_id,target_type,target_id,status,result)
          values(r.company_id,r.id,'opportunity',o.id,'executed','Tarefa criada automaticamente para oportunidade em '||o.stage_name);
          v_executed := v_executed+1;
        end if;
      end loop;
    end if;

    if r.trigger_type='conversation_open' then
      for w in
        select id,contact_id,assigned_to,customer_name,customer_phone,updated_at
        from whatsapp_conversations
        where company_id=r.company_id and status in ('Aberta','Em atendimento')
          and updated_at <= now()-v_delay
        order by updated_at limit 100
      loop
        if exists(select 1 from automation_runs where automation_rule_id=r.id and target_type='conversation'
          and target_id=w.id and created_at >= now()-interval '24 hours') then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,owner_id,title,description,type,priority,due_at,status)
          values(r.company_id,w.contact_id,coalesce(w.assigned_to,v_owner),
            'Atendimento automático: '||coalesce(w.customer_name,w.customer_phone),
            coalesce(r.message,'Verificar conversa aberta e registrar próximo passo.'),
            coalesce(r.config->>'task_type','Atendimento'),coalesce(r.config->>'priority','Alta'),now(),'Pendente');
          insert into automation_runs(company_id,automation_rule_id,target_type,target_id,status,result)
          values(r.company_id,r.id,'conversation',w.id,'executed','Tarefa criada automaticamente para conversa aberta');
          v_executed := v_executed+1;
        end if;
      end loop;
    end if;
  end loop;

  insert into system_job_heartbeat(job_name,last_run_at,status,details)
  values('clack-automation-engine',now(),'ok',jsonb_build_object('executed',v_executed,'skipped',v_skipped))
  on conflict(job_name) do update set last_run_at=excluded.last_run_at,status=excluded.status,details=excluded.details;

  return jsonb_build_object('executed',v_executed,'skipped',v_skipped,'ran_at',now());
end;
$func$;

-- Supabase cron calls the public Vercel endpoint every five minutes.
do $do$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='clack-public-message-engine' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;

  perform cron.schedule(
    'clack-public-message-engine',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := 'https://clack-crm-conversacional.vercel.app/api/cron/public-messages',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-clack-cron-secret',(select secret from system_internal_settings where key='public_message_cron_secret')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
end;
$do$;
