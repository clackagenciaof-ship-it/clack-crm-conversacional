-- Realtime for operational Public 360 surfaces.
do $$
begin
  begin alter publication supabase_realtime add table public.public_contacts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_requests; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_events; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_agenda; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_leaders; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_message_automations; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.public_message_automation_runs; exception when duplicate_object then null; end;
end $$;
