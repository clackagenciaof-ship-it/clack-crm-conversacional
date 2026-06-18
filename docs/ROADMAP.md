# Roadmap oficial — CLACK CRM Conversacional

## Estágio atual

```text
FASE 0 — Ideação e documento técnico: concluída
FASE 1 — MVP visual e funcional: concluída
FASE 1.1 — GitHub + Codespaces: concluída
FASE 1.2 — Vercel online: concluída
FASE 1.3 — Preparação para Supabase: concluída
FASE 2 — Banco real + login real: em preparação
FASE 3 — WhatsApp Cloud API: planejada
FASE 4 — InfinitePay: planejada
FASE 5 — Automações: planejada
FASE 6 — White label: planejada
FASE 7 — IA comercial: planejada
```

## Fase 1 — MVP publicado

Status: concluída.

Entregas:

- login demonstrativo;
- dashboard comercial;
- leads e contatos;
- ficha do cliente;
- Kanban comercial;
- tarefas e follow-ups;
- mensagens rápidas;
- relatórios básicos;
- configurações;
- Vercel publicada.

## Fase 2 — Supabase e autenticação real

Status: aguardando criação do projeto Supabase voltar ao normal.

Objetivo:

Transformar o MVP demonstrativo em um CRM com dados persistentes.

Entregas:

- projeto Supabase;
- schema SQL executado;
- variáveis na Vercel;
- Supabase Auth;
- tabela de empresas;
- tabela de perfis;
- login real;
- isolamento por empresa;
- contatos salvos no banco;
- oportunidades salvas no banco;
- tarefas salvas no banco;
- histórico real.

Critério de aceite:

- criar lead e ver permanecer após atualizar a página;
- mover card no Kanban e ver a etapa permanecer;
- concluir tarefa e ver status persistido;
- usuário acessar apenas dados da própria empresa.

## Fase 3 — WhatsApp Cloud API

Objetivo:

Tirar o CRM do botão externo simples e evoluir para atendimento conversacional oficial.

Entregas:

- configuração Meta Business;
- número conectado;
- webhooks de mensagens;
- recebimento de mensagens no CRM;
- envio de templates aprovados;
- histórico de conversa;
- distribuição por atendente;
- notas internas.

Critério de aceite:

- mensagem recebida aparece no CRM;
- atendente responde pelo painel;
- conversa fica registrada na ficha do cliente.

## Fase 4 — InfinitePay

Objetivo:

Permitir cobrança dentro do fluxo comercial.

Entregas:

- integração com API/checkout InfinitePay;
- criação de cobrança;
- link de pagamento;
- envio de link pelo atendimento;
- webhook de pagamento aprovado;
- status financeiro na oportunidade;
- histórico financeiro do cliente.

Critério de aceite:

- vendedor gera link de pagamento;
- cliente paga;
- CRM altera status para pago automaticamente.

## Fase 5 — Automações comerciais

Objetivo:

Reduzir perda de leads e organizar follow-up.

Entregas:

- mensagens automáticas de boas-vindas;
- réguas de follow-up;
- tarefas automáticas;
- distribuição automática de leads;
- alerta de lead parado;
- reativação de oportunidades;
- pesquisa de satisfação.

Critério de aceite:

- lead novo gera tarefa automática;
- oportunidade parada gera alerta;
- cliente recebe fluxo conforme etapa.

## Fase 6 — White label

Objetivo:

Permitir que empresas usem o CRM com sua marca.

Entregas:

- logo por empresa;
- cores personalizadas;
- domínio/subdomínio;
- tela de login personalizada;
- PWA instalável;
- planos por empresa.

Critério de aceite:

- empresa acessa CRM com sua identidade visual sem afetar outras empresas.

## Fase 7 — Inteligência Artificial

Objetivo:

Usar IA para aumentar vendas, retenção e produtividade.

Entregas:

- resumo automático de conversa;
- sugestão de resposta;
- classificação de lead quente/morno/frio;
- sugestão de próxima ação;
- análise de motivo de perda;
- diagnóstico do funil;
- assistente comercial interno.

Critério de aceite:

- IA sugere próxima ação útil com base no histórico do cliente e etapa do funil.

## Prioridade imediata

```text
1. Aguardar Supabase voltar.
2. Criar projeto Supabase.
3. Rodar schema SQL.
4. Adicionar variáveis na Vercel.
5. Ligar autenticação e dados reais.
```
