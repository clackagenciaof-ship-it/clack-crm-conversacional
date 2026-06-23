# CLACK CRM Conversacional — Checklist final antes do redeploy

## Migrations obrigatórias

1. 004_whatsapp_module.sql
2. 005_company_plan_limits.sql
3. 006_company_access_and_audit.sql
4. 007_team_audit_triggers.sql
5. 008_role_based_rls.sql
6. 009_disable_profile_trigger.sql
7. 010_user_onboarding.sql
8. 011_rls_security_complete.sql
9. 012_atendimento_complete.sql
10. 013_whatsapp_cloud_official.sql
11. 014_advanced_funnel.sql

Após cada arquivo, o Supabase deve retornar sucesso.

## Build local
Rodar no Codespaces: git pull origin main, npm run build e git status.

## Testes

### Usuários
- Login com Admin Empresa ativo.
- Login bloqueado para usuário inativo ou removido.
- Criar, editar, inativar, reativar e excluir acesso.
- Validar limite do plano.

### Atendimento
- Criar conversa teste.
- Filtrar por status, prioridade e responsável.
- Assumir, transferir, resolver e arquivar.
- Enviar resposta e validar histórico.

### WhatsApp
- Conferir conta cadastrada.
- Conferir URL do webhook.
- Receber mensagem real via webhook.
- Conferir status enviado, entregue, lido ou falha.
- Enviar texto pelo CRM.
- Enviar template quando a Meta estiver ativa.

### Funil avançado
- Criar etapa nova em Configurações.
- Editar nome, ordem e probabilidade.
- Arquivar etapa.
- Abrir Kanban e conferir etapa nova.
- Editar oportunidade com valor, previsão e probabilidade.
- Mover oportunidade entre etapas.

## Redeploy
Somente depois dos testes locais passarem: abrir Vercel, ir em Deployments, selecionar último deploy e clicar em Redeploy.
