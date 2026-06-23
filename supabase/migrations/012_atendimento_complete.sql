-- CLACK CRM Conversacional — Fase 6: Central de Atendimento completa
-- Execute este arquivo uma vez no SQL Editor do Supabase após a migration 011.

alter table whatsapp_conversations
add column if not exists assigned_to uuid references profiles(id) on delete set null,
add column if not exists priority text not null default 'Normal',
add column if not exists channel text not null default 'WhatsApp',
add column if not exists archived_at timestamptz,
add column if not exists resolved_at timestamptz;

alter table whatsapp_messages
add column if not exists user_id uuid references profiles(id) on delete set null;

create table if not exists atendimento_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  conversation_id uuid references whatsapp_conversations(id) on delete cascade,
  actor_profile_id uuid references profiles(id) on delete set null,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);

alter table atendimento_audit_logs enable row level security;

drop policy if exists "atendimento audit read by role" on atendimento_audit_logs;
create policy "atendimento audit read by role" on atendimento_audit_logs
for select
using (
  company_id = public.current_company_id()
  and (
    public.current_profile_is_manager()
    or public.current_profile_is_attendant()
  )
);

create index if not exists idx_whatsapp_conversations_assigned_status
on whatsapp_conversations(company_id, assigned_to, status, last_message_at desc);

create index if not exists idx_atendimento_audit_conversation_created
on atendimento_audit_logs(conversation_id, created_at desc);
