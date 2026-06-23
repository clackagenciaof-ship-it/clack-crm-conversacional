-- CLACK CRM Conversacional — ajuste temporário da auditoria de equipe
-- Remove o gatilho automático em profiles. A auditoria de usuários será registrada pela API do CRM.

drop trigger if exists trg_audit_profile_changes on public.profiles;
