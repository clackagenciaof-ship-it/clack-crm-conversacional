-- Scheduled customer WhatsApp campaigns with opt-in only.
insert into system_internal_settings(key,secret)
values ('campaign_cron_secret', replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''))
on conflict (key) do nothing;

do $do$
declare existing_job bigint;
begin
  select jobid into existing_job from cron.job where jobname='clack-campaign-engine' limit 1;
  if existing_job is not null then perform cron.unschedule(existing_job); end if;

  perform cron.schedule(
    'clack-campaign-engine',
    '*/5 * * * *',
    $cron$
      select net.http_post(
        url := 'https://clack-crm-conversacional.vercel.app/api/cron/campaigns',
        headers := jsonb_build_object(
          'Content-Type','application/json',
          'x-clack-cron-secret',(select secret from system_internal_settings where key='campaign_cron_secret')
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
end;
$do$;
