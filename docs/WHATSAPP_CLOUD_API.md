# Fase 3 — WhatsApp Cloud API

Esta fase conecta o CLACK CRM Conversacional ao WhatsApp oficial, com recebimento de mensagens, registro de histórico e preparação para central de atendimento.

## Status

- Base de banco criada em `supabase/migrations/004_whatsapp_module.sql`.
- Endpoint inicial criado em `/api/whatsapp/webhook`.
- O webhook já responde ao desafio de verificação da Meta.
- O webhook já registra eventos brutos em `whatsapp_webhook_events` quando o ambiente possui chave de servidor configurada.

## Variáveis necessárias

No ambiente da Vercel, adicionar somente quando formos ativar a integração oficial:

```env
WHATSAPP_VERIFY_TOKEN=token-criado-por-nos
WHATSAPP_ACCESS_TOKEN=token-da-meta
WHATSAPP_PHONE_NUMBER_ID=id-do-numero
WHATSAPP_BUSINESS_ACCOUNT_ID=id-da-conta-business
META_APP_SECRET=app-secret-da-meta
SUPABASE_SERVICE_ROLE_KEY=chave-servidor-do-supabase
```

A chave de servidor do Supabase nunca deve ser usada em componente de tela, navegador ou variável pública.

## URL do webhook

Após o deploy, a URL será:

```text
https://clack-crm-conversacional.vercel.app/api/whatsapp/webhook
```

## Banco de dados

A migration 004 cria:

- `whatsapp_accounts`
- `whatsapp_conversations`
- `whatsapp_messages`
- `whatsapp_webhook_events`

## Próximas entregas da Fase 3

1. Rodar a migration 004 no Supabase.
2. Configurar variáveis de ambiente na Vercel.
3. Validar o webhook na Meta.
4. Processar mensagens recebidas e vincular ao contato por telefone.
5. Criar tela de Central de Atendimento.
6. Exibir histórico automático de mensagens na ficha do lead.
7. Permitir envio de mensagem pelo CRM.
8. Registrar status enviado, entregue e lido.

## Critério de aceite

A Fase 3 estará validada quando:

- uma mensagem enviada ao WhatsApp oficial entrar no webhook;
- o evento for salvo no Supabase;
- a mensagem aparecer no histórico do lead correto;
- a equipe puder responder pelo CRM.
