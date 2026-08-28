-- CLACK ONE Ops hardening: RLS, trigger permissions and FK indexes.

revoke execute on function public.log_public_ops_change() from public;
revoke execute on function public.log_public_ops_change() from anon;
revoke execute on function public.log_public_ops_change() from authenticated;

create index if not exists idx_public_contacts_leader_fk on public_contacts(leader_id);
create index if not exists idx_public_electorate_territory_fk on public_electorate_stats(territory_id);
create index if not exists idx_public_events_company_fk on public_events(company_id);
create index if not exists idx_public_leaders_territory_fk on public_leaders(territory_id);
create index if not exists idx_public_audit_actor_fk on public_ops_audit_logs(actor_profile_id);
create index if not exists idx_public_requests_assigned_fk on public_requests(assigned_to);
create index if not exists idx_public_requests_contact_fk on public_requests(contact_id);
create index if not exists idx_public_simulations_company_fk on public_simulations(company_id);

drop policy if exists "company public territories" on public_territories;
create policy "company public territories" on public_territories for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public contacts" on public_contacts;
create policy "company public contacts" on public_contacts for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public requests" on public_requests;
create policy "company public requests" on public_requests for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public events" on public_events;
create policy "company public events" on public_events for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public notices" on public_notices;
create policy "company public notices" on public_notices for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public leaders" on public_leaders;
create policy "company public leaders" on public_leaders for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public agenda" on public_agenda;
create policy "company public agenda" on public_agenda for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public assets" on public_assets;
create policy "company public assets" on public_assets for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public electorate" on public_electorate_stats;
create policy "company public electorate" on public_electorate_stats for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public simulations" on public_simulations;
create policy "company public simulations" on public_simulations for all
using (company_id in (select company_id from profiles where id = (select auth.uid())))
with check (company_id in (select company_id from profiles where id = (select auth.uid())));

drop policy if exists "company public audit read" on public_ops_audit_logs;
create policy "company public audit read" on public_ops_audit_logs for select
using (company_id in (select company_id from profiles where id = (select auth.uid())));
