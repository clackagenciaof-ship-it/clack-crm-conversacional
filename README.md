# CLACK ONE — CRM & Operations

O **CLACK ONE** é uma plataforma SaaS multiempresa para **captação, relacionamento, atendimento, vendas, automação, execução, financeiro e inteligência operacional**.

Produção:

`https://clack-crm-conversacional.vercel.app/`

## Proposta do produto

O CLACK não é somente um cadastro de leads. A operação conecta seis motores:

**ATENDE → ENTENDE → EXECUTA → RESOLVE → VENDE → APRENDE**

A mesma base serve empresas de serviços, e-commerce, clínicas, odontologia, imobiliárias, academias, restaurantes, hotéis, provedores, consultorias e outras operações com relacionamento e receita.

## Operação real e demonstração

- Contas autenticadas carregam **somente dados reais da própria empresa**.
- Falha de banco não injeta dados fictícios na sessão.
- A demonstração é uma entrada explícita e isolada na tela de login.
- Dados demo ficam em `src/data/demo-data.ts` e não são usados por uma empresa autenticada.

## Núcleo operacional

### Visão geral
Indicadores reais de contatos, pipeline, receita ganha, conversão e tarefas. O bloco de follow-up mostra apenas as prioridades mais importantes.

### Contatos
Cadastro e histórico de relacionamento. Ao criar um contato comercial, o CRM pode iniciar uma oportunidade no pipeline.

### Pipeline
Kanban operacional com visão padrão de negócios em andamento, valores por etapa, probabilidade, próxima ação, ganho e perda.

### Tarefas
Fila de execução com filtros por pendentes, vencidas, concluídas e todas.

### Atendimento
Inbox de WhatsApp com:
- fila;
- responsável;
- prioridade;
- transferência;
- resolução;
- histórico;
- modelos rápidos;
- fluxos;
- Agente Will;
- realtime quando disponível e contingência de atualização.

### ONE Core
O antigo painel conceitual foi substituído por leitura operacional real:
- estado do Supabase;
- conta e provedor WhatsApp;
- webhook;
- automações e fluxos;
- Agente Will;
- runtime;
- OmniRoute por origem;
- prioridades calculadas a partir da operação.

### Catálogo
Produtos e serviços são ligados a oportunidades e financeiro. O catálogo é a referência para vendas, propostas e IA.

### Financeiro
Fluxo: **venda ganha → recebimento → baixa → entrada**.

### Relatórios
Indicadores comerciais reais com opção de **Imprimir / Salvar em PDF** pelo navegador.

### Implantação
Checklist baseado em diagnóstico real de usuários, produtos, pipeline e automações.

## Público 360

Vertical operacional para:
- eleitorado **agregado** por território e fonte oficial;
- contatos de relacionamento;
- lideranças;
- demandas;
- tarefas;
- eventos;
- agenda;
- geolocalização;
- comunicação informativa com consentimento;
- veículos e ativos;
- simulações matemáticas agregadas;
- auditoria.

Não foi implementado perfil individual de intenção de voto, preferência partidária ou microsegmentação persuasiva.

## Perfis

- **Administrador**: operação completa, integrações e administração.
- **Gestor**: gestão, equipe, atendimento, pipeline, relatórios, financeiro e implantação.
- **Vendedor**: contatos, pipeline, tarefas, atendimento, mensagens, catálogo e ONE Core.
- **Atendimento**: contatos, conversas, tarefas, mensagens, catálogo e Público 360 quando habilitado.
- **Financeiro**: pipeline, catálogo, relatórios e recebimentos.

## Stack

- Next.js 14
- TypeScript
- Supabase Auth + PostgreSQL + RLS + Realtime
- Vercel
- WhatsApp Cloud API
- integrações e automações versionadas por API/migrations

## Desenvolvimento

```bash
npm install
npm run dev
npm run build
npm run start
```

Variáveis principais:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_GRAPH_API_VERSION=
```

## Documentação

- `docs/ARQUITETURA_TECNICA.md`
- `docs/COMMERCIAL_SUITE.md`
- `docs/SUPABASE_CONEXAO.md`

**CLACK ONE** — uma operação única para atender, vender e executar com dados reais.
