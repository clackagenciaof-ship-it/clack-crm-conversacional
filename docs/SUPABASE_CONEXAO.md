# Conexão Supabase — CLACK CRM Conversacional

Este documento orienta a ativação do banco real do Clack CRM Conversacional quando o Supabase liberar a criação de novos projetos.

## 1. Criar projeto Supabase

Nome sugerido:

```text
clack-crm-conversacional
```

Região sugerida:

```text
América do Sul / São Paulo
```

Salve a senha do banco em local seguro.

## 2. Rodar o schema

No Supabase:

1. Abra **SQL Editor**.
2. Clique em **New query**.
3. Copie o conteúdo de:

```text
supabase/migrations/001_initial_schema.sql
```

4. Clique em **Run**.

## 3. Copiar as chaves do projeto

No Supabase, vá em:

```text
Project Settings > API
```

Copie:

```text
Project URL
anon public key
```

## 4. Configurar Vercel

No projeto da Vercel:

```text
Settings > Environment Variables
```

Adicione:

```text
NEXT_PUBLIC_SUPABASE_URL=cole_a_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=cole_a_anon_public_key
NEXT_PUBLIC_APP_NAME=CLACK CRM Conversacional
```

Depois vá em:

```text
Deployments > Redeploy
```

## 5. O que já foi preparado no código

Arquivos criados:

```text
src/lib/supabase/client.ts
src/lib/supabase/database.types.ts
src/lib/supabase/crm-repository.ts
```

Funções preparadas:

- `hasSupabaseConfig()`
- `getSupabaseStatus()`
- `createSupabaseBrowserClient()`
- `getCurrentProfile()`
- `listContacts()`
- `createContact()`
- `listOpportunities()`
- `createOpportunity()`
- `updateOpportunity()`
- `listTasks()`
- `createTask()`
- `updateTask()`
- `listQuickMessages()`
- `createQuickMessage()`
- `createActivityLog()`

## 6. Próxima alteração no app

Depois que as variáveis estiverem configuradas, o arquivo `src/app/page.tsx` será dividido em módulos para trocar dados locais por dados Supabase.

Ordem de integração:

1. Autenticação real.
2. Buscar perfil do usuário.
3. Buscar empresa do usuário.
4. Listar contatos do banco.
5. Criar contatos no banco.
6. Listar e mover oportunidades.
7. Criar e concluir tarefas.
8. Registrar histórico real.

## 7. Estratégia segura

Enquanto as variáveis do Supabase não existem, o MVP continua funcionando com dados locais. Quando as variáveis forem configuradas, a camada de dados já estará pronta para ser ligada sem derrubar a apresentação comercial.
