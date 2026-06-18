# CLACK CRM Conversacional

MVP 1 do **Clack CRM Conversacional**, uma plataforma SaaS responsiva para gestão de vendas, atendimento, leads e funil comercial.

Link em produção:

```text
https://clack-crm-conversacional.vercel.app/
```

## Objetivo

Criar uma base funcional para empresas que vendem pelo WhatsApp organizarem:

- contatos e leads;
- oportunidades comerciais;
- funil em Kanban;
- tarefas e follow-ups;
- mensagens rápidas;
- relatórios básicos;
- configurações de empresa e perfis.

## Escopo do MVP 1

Incluído nesta versão:

- Login demonstrativo.
- Dashboard comercial.
- Cadastro e filtro de leads.
- Ficha do cliente com histórico.
- Kanban comercial com movimentação de oportunidades.
- Abertura de conversa externa via link de mensageria.
- Tarefas e follow-ups.
- Mensagens rápidas copiáveis.
- Relatórios básicos.
- Configurações e perfis.
- Layout responsivo com identidade visual verde turquesa da Clack.

Fora do MVP 1, mas preparado como próximas fases:

- automações;
- pagamentos InfinitePay;
- WhatsApp Cloud API;
- webhooks;
- white label;
- inteligência artificial.

## Como rodar no Codespaces ou localmente

```bash
npm install
npm run dev
```

Depois acesse a porta exibida pelo Next.js, normalmente:

```bash
http://localhost:3000
```

Na tela de login, use qualquer e-mail e senha. Este MVP está em modo demonstração com dados locais.

## Scripts úteis

```bash
npm run dev
npm run build
npm run start
```

## Estrutura técnica preparada

```text
src/
  app/
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

## Documentação do produto

- `docs/ARQUITETURA_TECNICA.md` — arquitetura técnica e estratégia de evolução.
- `docs/ROADMAP.md` — roadmap oficial por fase.
- `docs/BACKLOG.md` — backlog técnico e funcional.
- `docs/SUPABASE_CONEXAO.md` — conexão futura com Supabase.
- `docs/IDENTIDADE_VISUAL.md` — identidade visual verde turquesa do CRM.
- `docs/PROXIMOS_PASSOS.md` — próximos passos técnicos.

## Dados demonstrativos

Empresa: **Clack Growth Company**

Usuários demonstrativos:

- Will Sampaio — Admin
- Amanda — Gestora
- Lucas — Vendedor
- Daniela — Atendente

Leads demonstrativos:

- Lucas Pereira
- Ana Clara
- Isabela Costa
- Marcos Oliveira
- Fernanda Lima
- Rafael Santos
- Thiago Almeida
- Evelyn Silva
- Sérgio Roberto
- Márcio Costa

## Paleta visual

A interface segue uma identidade verde turquesa, mais limpa, clara, institucional e profissional:

- Verde profundo: `#005954`
- Verde institucional: `#338b85`
- Turquesa principal: `#5dc1b9`
- Turquesa claro: `#9ce0db`
- Fundo gelo: `#d5ffff`
- Branco: `#ffffff`
- Cinzas de apoio: tons frios derivados de azul/cinza e verde acinzentado

Gradiente oficial:

```css
linear-gradient(135deg, #005954 0%, #338b85 48%, #5dc1b9 100%)
```

## Estágio atual

```text
FASE 0 — Ideação e documento técnico: concluída
FASE 1 — MVP visual e funcional: concluída
FASE 1.1 — GitHub + Codespaces: concluída
FASE 1.2 — Vercel online: concluída
FASE 1.3 — Preparação para Supabase: concluída
FASE 2 — Banco real + login real: em preparação
```

## Próxima etapa técnica

A próxima evolução é conectar backend real com Supabase:

1. Criar projeto no Supabase.
2. Rodar o schema `supabase/migrations/001_initial_schema.sql`.
3. Configurar variáveis na Vercel.
4. Migrar os dados locais para banco real.
5. Adicionar autenticação real.
6. Depois integrar API oficial de mensagens e pagamentos.

---

**CLACK CRM Conversacional** — venda mais, atenda melhor e acompanhe seu funil em tempo real.
