# Backlog oficial — CLACK CRM Conversacional

## Organização do backlog

Cada item está organizado por fase, prioridade e critério de aceite.

---

## Fase 2 — Supabase e autenticação real

### Alta prioridade

- Criar projeto Supabase.
- Rodar `supabase/migrations/001_initial_schema.sql`.
- Configurar variáveis na Vercel.
- Criar login real com Supabase Auth.
- Criar perfil do usuário logado.
- Criar vínculo usuário/empresa.
- Listar contatos reais.
- Criar contato real.
- Listar oportunidades reais.
- Mover card e persistir etapa.
- Criar e concluir tarefas reais.

### Média prioridade

- Histórico real de atividades.
- Filtros persistentes.
- Controle visual por perfil.
- Tela de onboarding da empresa.
- Importação de contatos por CSV.

### Baixa prioridade

- Exportação CSV.
- Auditoria avançada.
- Campos personalizados.

---

## Fase 3 — WhatsApp Cloud API

### Alta prioridade

- Configurar Meta App.
- Configurar webhook.
- Receber mensagens.
- Enviar mensagens pelo painel.
- Salvar conversa no histórico.
- Vincular mensagem ao contato.

### Média prioridade

- Templates aprovados.
- Distribuição automática por atendente.
- Status de mensagem: enviada, entregue, lida.
- Notas internas.

### Baixa prioridade

- Múltiplos números.
- Caixa compartilhada por setor.

---

## Fase 4 — InfinitePay

### Alta prioridade

- Criar módulo financeiro.
- Gerar link de pagamento.
- Vincular cobrança à oportunidade.
- Receber webhook de pagamento aprovado.
- Atualizar oportunidade como paga.

### Média prioridade

- Histórico financeiro do cliente.
- Estorno.
- Cobrança recorrente.

---

## Fase 5 — Automações

### Alta prioridade

- Criar motor de automação simples.
- Criar fluxo de boas-vindas.
- Criar tarefa automática para lead novo.
- Alerta de lead parado.

### Média prioridade

- Régua de follow-up.
- Reativação de lead.
- Pesquisa de satisfação.

---

## Fase 6 — White label

### Alta prioridade

- Logo por empresa.
- Cores por empresa.
- Subdomínio por empresa.
- Tela de login personalizada.

### Média prioridade

- PWA por empresa.
- Planos e limites.

---

## Fase 7 — IA

### Alta prioridade

- Resumo de conversa.
- Sugestão de resposta.
- Classificação de lead.
- Próxima ação recomendada.

### Média prioridade

- Análise de funil.
- Diagnóstico de perdas.
- Roteiros comerciais.

---

## Refatoração técnica

### Alta prioridade

- Quebrar `src/app/page.tsx` em componentes.
- Usar `src/types/crm.ts` nos componentes.
- Usar `src/data/demo-data.ts` como fonte local.
- Usar `src/lib/crm/constants.ts` no app.
- Usar `src/lib/crm/business-rules.ts` nas ações.

### Critério de aceite

- `npm run build` passa sem erro;
- interface visual permanece igual;
- link da Vercel continua funcionando;
- dados demonstrativos seguem carregando.
