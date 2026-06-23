# CLACK CRM Conversacional — Checklist final antes do redeploy

## Objetivo
Consolidar a versão comercial do CRM antes de executar um único redeploy na Vercel.

## Migrations obrigatórias
Executar no Supabase SQL Editor, nesta ordem, caso ainda não tenham sido executadas:

1. `004_whatsapp_module.sql`
2. `005_company_plan_limits.sql`
3. `006_company_access_and_audit.sql`
4. `007_team_audit_triggers.sql`
5. `008_role_based_rls.sql`
6. `009_disable_profile_trigger.sql`
7. `010_user_onboarding.sql`

Após cada arquivo, o Supabase deve retornar sucesso.

## Build local
Rodar no Codespaces:

```bash
git pull origin main
npm run build
git status
```

Resultado esperado: árvore limpa, sem arquivos pendentes.

## Testes funcionais

### Login e sessão
- Login com Admin Empresa ativo.
- Login bloqueado para usuário inativo.
- Login bloqueado se empresa ou plano estiver bloqueado.

### Empresas e planos
- Criar empresa na Área ADM Clack.
- Alterar plano Inicial, Growth e Pro.
- Alterar limite de usuários.
- Bloquear e liberar empresa.
- Selecionar empresa ativa.

### Equipe e acessos
- Criar usuário real.
- Editar nome, perfil e status.
- Inativar e reativar usuário.
- Enviar acesso e copiar mensagem de onboarding.
- Ver contagem por perfil.
- Validar limite do plano.

### CRM operacional
- Dashboard carrega indicadores.
- Leads criam, editam e excluem.
- Kanban edita valor e etapa.
- Tarefas criam, editam e concluem.
- Mensagens rápidas criam, editam, inativam e excluem.
- Atendimento cria conversa teste e registra resposta.
- Relatórios carregam.

### WhatsApp Cloud API
- Conta WhatsApp cria, edita e exclui.
- Webhook URL aparece.
- Token de verificação aparece.

## Vercel
Confirmar variáveis públicas e variáveis server-side em Production antes do redeploy.

## Redeploy
Na Vercel:

1. Abrir projeto `clack-crm-conversacional`.
2. Ir em Deployments.
3. Selecionar o último deploy.
4. Clicar em Redeploy.
5. Testar o domínio principal.
