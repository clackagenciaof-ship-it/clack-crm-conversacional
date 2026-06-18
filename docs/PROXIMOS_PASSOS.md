# Próximos passos técnicos — CLACK CRM Conversacional

## Estado atual

O repositório já contém o MVP 1 em Next.js, com interface funcional e dados locais para demonstração.

## Passo 1 — Rodar no Codespaces

No terminal:

```bash
npm install
npm run dev
```

Abra a porta 3000 quando o Codespaces oferecer o link.

## Passo 2 — Publicar na Vercel

1. Acesse vercel.com.
2. Conecte sua conta GitHub.
3. Importe o repositório `clack-crm-conversacional`.
4. Mantenha o framework como Next.js.
5. Clique em Deploy.

## Passo 3 — Criar Supabase

1. Acesse supabase.com.
2. Crie um projeto.
3. Abra SQL Editor.
4. Rode o arquivo `supabase/migrations/001_initial_schema.sql`.
5. Copie URL e anon key.
6. No projeto, crie `.env.local` com base no `.env.example`.

## Passo 4 — Conectar dados reais

Trocar os arrays locais do arquivo `src/app/page.tsx` por chamadas Supabase para:

- contatos;
- oportunidades;
- tarefas;
- mensagens rápidas;
- histórico.

## Passo 5 — Fases futuras

1. Automação e réguas comerciais.
2. Integração com pagamentos InfinitePay.
3. API oficial de mensageria.
4. Webhooks.
5. White label.
6. IA para sugestão de resposta, resumo de conversa e análise do funil.
