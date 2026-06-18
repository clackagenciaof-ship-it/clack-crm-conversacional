# Arquitetura técnica — CLACK CRM Conversacional

## Estado atual

O MVP 1 já está publicado na Vercel com dados demonstrativos locais e camada inicial preparada para Supabase.

Link de produção:

```text
https://clack-crm-conversacional.vercel.app/
```

## Objetivo técnico

Transformar o MVP visual em um SaaS real, com:

- autenticação;
- multiempresa;
- banco real;
- persistência de leads, oportunidades, tarefas e histórico;
- arquitetura preparada para WhatsApp Cloud API, InfinitePay, automações, white label e IA.

## Stack atual

```text
Frontend: Next.js 14 + React + TypeScript
Estilo: CSS global com identidade Clack
Hospedagem: Vercel
Versionamento: GitHub
Ambiente de desenvolvimento: GitHub Codespaces
Banco planejado: Supabase/Postgres
Autenticação planejada: Supabase Auth
```

## Estrutura técnica proposta

```text
src/
  app/
    layout.tsx
    page.tsx
    globals.css
  components/
    auth/
    dashboard/
    leads/
    kanban/
    tasks/
    messages/
    reports/
    settings/
  data/
    demo-data.ts
  lib/
    crm/
      business-rules.ts
      constants.ts
      formatters.ts
    supabase/
      client.ts
      crm-repository.ts
      database.types.ts
  types/
    crm.ts
```

## Camadas do sistema

### 1. Interface

Responsável por renderizar telas, formulários, cards, tabelas e navegação.

Telas principais:

- Login;
- Dashboard;
- Leads;
- Ficha do cliente;
- Kanban;
- Tarefas;
- Mensagens rápidas;
- Relatórios;
- Configurações.

### 2. Regras de negócio

Arquivo base:

```text
src/lib/crm/business-rules.ts
```

Regras centrais:

- contato exige nome e WhatsApp;
- alerta de duplicidade por telefone;
- oportunidade ganha exige valor final;
- oportunidade perdida exige motivo;
- tarefa exige título, responsável e prazo;
- etapa Fechado transforma status em Ganha;
- etapa Perdido transforma status em Perdida.

### 3. Dados demonstrativos

Arquivo base:

```text
src/data/demo-data.ts
```

Serve para manter o MVP funcionando mesmo sem banco configurado.

### 4. Camada Supabase

Arquivos base:

```text
src/lib/supabase/client.ts
src/lib/supabase/crm-repository.ts
src/lib/supabase/database.types.ts
```

Quando as variáveis de ambiente forem configuradas, essa camada será usada para buscar e salvar dados reais.

### 5. Banco de dados

Schema inicial:

```text
supabase/migrations/001_initial_schema.sql
```

Tabelas previstas:

- companies;
- profiles;
- contacts;
- pipelines;
- pipeline_stages;
- opportunities;
- tasks;
- quick_messages;
- activity_logs.

## Estratégia de evolução

### Etapa A — Refatoração segura

Dividir o arquivo `src/app/page.tsx` em componentes menores sem alterar comportamento visual.

Ordem sugerida:

1. Extrair tipos para `src/types/crm.ts`.
2. Extrair constantes para `src/lib/crm/constants.ts`.
3. Extrair dados demonstrativos para `src/data/demo-data.ts`.
4. Extrair helpers para `src/lib/crm/formatters.ts`.
5. Extrair regras para `src/lib/crm/business-rules.ts`.
6. Extrair componentes tela por tela.

### Etapa B — Supabase read-only

Com o Supabase criado:

1. autenticar usuário;
2. buscar perfil;
3. buscar empresa;
4. listar contatos;
5. listar oportunidades;
6. listar tarefas.

### Etapa C — Supabase write

Depois da leitura real:

1. criar contato;
2. criar oportunidade;
3. mover oportunidade no Kanban;
4. marcar como ganha/perdida;
5. criar/concluir tarefa;
6. registrar histórico real.

### Etapa D — Operação comercial

Adicionar funções avançadas:

- filtros persistentes;
- importação CSV;
- exportação de relatório;
- alertas de tarefas vencidas;
- controle por perfil;
- onboarding da empresa.

## Princípio técnico

Nunca quebrar o link de produção.

Toda nova etapa deve manter:

```text
npm run build
```

passando antes de publicar.
