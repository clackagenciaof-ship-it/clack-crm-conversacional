-- CLACK CRM Conversacional — auditoria automática de equipe
-- Execute este arquivo uma vez no SQL Editor do Supabase.

create or replace function public.audit_profile_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action_name text;
begin
  if tg_op = 'INSERT' then
    action_name := 'user_created';

    insert into public.company_plan_audit_logs (
      company_id,
      actor_profile_id,
      action,
      previous_value,
      next_value
    ) values (
      new.company_id,
      auth.uid(),
      action_name,
      null,
      jsonb_build_object(
        'id', new.id,
        'name', new.name,
        'email', new.email,
        'role', new.role,
        'status', new.status
      )
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.role is distinct from new.role then
      action_name := 'user_role_updated';
    elsif old.status is distinct from new.status then
      action_name := 'user_status_updated';
    else
      action_name := 'user_updated';
    end if;

    insert into public.company_plan_audit_logs (
      company_id,
      actor_profile_id,
      action,
      previous_value,
      next_value
    ) values (
      new.company_id,
      auth.uid(),
      action_name,
      jsonb_build_object(
        'id', old.id,
        'name', old.name,
        'email', old.email,
        'role', old.role,
        'status', old.status
      ),
      jsonb_build_object(
        'id', new.id,
        'name', new.name,
        'email', new.email,
        'role', new.role,
        'status', new.status
      )
    );

    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_audit_profile_changes on public.profiles;

create trigger trg_audit_profile_changes
after insert or update of name, role, status on public.profiles
for each row
when (new.company_id is not null)
execute function public.audit_profile_changes();
