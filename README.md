# CLACK CRM Conversacional

MVP 1 do **Clack CRM Conversacional**, uma plataforma SaaS responsiva para gestão de vendas, atendimento, leads e funil comercial.

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
- Layout responsivo com identidade visual da Clack Growth Company.

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

A interface segue a identidade premium da Clack:

- Fundo principal: `#08001E`
- Fundo secundário: `#10012B`
- Roxo: `#360F6C`, `#6C1AAF`, `#4E17BB`
- Laranja: `#FC540B`, `#EA7804`
- Amarelo performance: `#F8A001`
- Magenta/Rosa: `#BE1E6F`, `#D7324C`
- Branco: `#FFFFFF`
- Cinza apoio: `#AD9687`

## Próxima etapa técnica

A próxima evolução é conectar backend real com Supabase:

1. Criar projeto no Supabase.
2. Criar tabelas de empresas, usuários, contatos, oportunidades, tarefas, mensagens e histórico.
3. Migrar os dados locais para banco real.
4. Adicionar autenticação real.
5. Publicar na Vercel.
6. Depois integrar API oficial de mensagens e pagamentos.

---

**CLACK CRM Conversacional** — venda mais, atenda melhor e acompanhe seu funil em tempo real.
