-- CLACK ONE live operations: realtime + scheduled automations + cleanup.

create extension if not exists pg_cron;

-- Realtime para as áreas que precisam refletir mudanças sem recarregar a aplicação.
alter publication supabase_realtime add table public.contacts;
alter publication supabase_realtime add table public.opportunities;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.whatsapp_conversations;
alter publication supabase_realtime add table public.whatsapp_messages;
alter publication supabase_realtime add table public.automation_runs;

-- Remove rastros antigos de demonstração que perderam o alvo real.
delete from automation_runs ar
where (ar.target_type='contact' and not exists (select 1 from contacts c where c.id=ar.target_id and c.company_id=ar.company_id))
   or (ar.target_type='opportunity' and not exists (select 1 from opportunities o where o.id=ar.target_id and o.company_id=ar.company_id))
   or (ar.target_type='conversation' and not exists (select 1 from whatsapp_conversations w where w.id=ar.target_id and w.company_id=ar.company_id));

delete from message_campaigns mc
where mc.status='draft'
  and mc.executed_at is null
  and not exists (select 1 from message_campaign_recipients mr where mr.campaign_id=mc.id);

-- Evita regra duplicada de lead quente no tenant atual.
update automation_rules
set active=false, updated_at=now()
where id='c994d133-2049-4c7a-8b84-7f573b8391b9';

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
    order by
      case lower(p.role)
        when 'admin empresa' then 1
        when 'admin' then 1
        when 'gestor' then 2
        when 'vendedor' then 3
        when 'atendente' then 4
        else 9
      end,
      p.created_at
    limit 1;

    v_delay := make_interval(mins => greatest(coalesce(r.delay_minutes,0),0));

    if r.trigger_type='lead_hot_idle' then
      for c in
        select id,name,owner_id,updated_at
        from contacts
        where company_id=r.company_id
          and temperature='Quente'
          and status<>'Arquivado'
          and updated_at <= now()-v_delay
        order by updated_at
        limit 100
      loop
        if exists (
          select 1 from automation_runs
          where automation_rule_id=r.id
            and target_type='contact'
            and target_id=c.id
            and created_at >= now()-interval '24 hours'
        ) then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,owner_id,title,description,type,priority,due_at,status)
          values(
            r.company_id,c.id,coalesce(c.owner_id,v_owner),
            'Follow-up automático: '||c.name,
            coalesce(r.message,'Fazer follow-up e registrar retorno no CRM.'),
            coalesce(r.config->>'task_type','Follow-up'),
            coalesce(r.config->>'priority','Alta'),
            now(),
            'Pendente'
          );

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
        where company_id=r.company_id
          and status='Aberta'
          and stage_name=coalesce(nullif(r.stage_name,''),'Proposta Enviada')
          and updated_at <= now()-v_delay
        order by updated_at
        limit 100
      loop
        if exists (
          select 1 from automation_runs
          where automation_rule_id=r.id
            and target_type='opportunity'
            and target_id=o.id
            and created_at >= now()-interval '24 hours'
        ) then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,opportunity_id,owner_id,title,description,type,priority,due_at,status)
          values(
            r.company_id,o.contact_id,o.id,coalesce(o.owner_id,v_owner),
            'Retomar oportunidade: '||o.title,
            coalesce(r.message,'Retomar oportunidade e conduzir ao próximo passo.'),
            coalesce(r.config->>'task_type','Comercial'),
            coalesce(r.config->>'priority','Média'),
            now(),
            'Pendente'
          );

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
        where company_id=r.company_id
          and status in ('Aberta','Em atendimento')
          and updated_at <= now()-v_delay
        order by updated_at
        limit 100
      loop
        if exists (
          select 1 from automation_runs
          where automation_rule_id=r.id
            and target_type='conversation'
            and target_id=w.id
            and created_at >= now()-interval '24 hours'
        ) then
          v_skipped := v_skipped+1;
        else
          insert into tasks(company_id,contact_id,owner_id,title,description,type,priority,due_at,status)
          values(
            r.company_id,w.contact_id,coalesce(w.assigned_to,v_owner),
            'Atendimento automático: '||coalesce(w.customer_name,w.customer_phone),
            coalesce(r.message,'Verificar conversa aberta e registrar próximo passo.'),
            coalesce(r.config->>'task_type','Atendimento'),
            coalesce(r.config->>'priority','Alta'),
            now(),
            'Pendente'
          );

          insert into automation_runs(company_id,automation_rule_id,target_type,target_id,status,result)
          values(r.company_id,r.id,'conversation',w.id,'executed','Tarefa criada automaticamente para conversa aberta');

          v_executed := v_executed+1;
        end if;
      end loop;
    end if;
  end loop;

  return jsonb_build_object('executed',v_executed,'skipped',v_skipped,'ran_at',now());
end;
$func$;

revoke execute on function public.run_clack_automation_rules() from public;
revoke execute on function public.run_clack_automation_rules() from anon;
revoke execute on function public.run_clack_automation_rules() from authenticated;

do $do$
declare
  existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='clack-automation-engine' limit 1;
  if existing_job is not null then
    perform cron.unschedule(existing_job);
  end if;

  perform cron.schedule(
    'clack-automation-engine',
    '*/5 * * * *',
    'select public.run_clack_automation_rules();'
  );
end;
$do$;
