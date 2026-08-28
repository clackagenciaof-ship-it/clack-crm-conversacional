# CLACK ONE — Arquitetura de Produto

## Princípio

O CLACK consolidou CRM, atendimento e os princípios operacionais do ONE CORE na mesma aplicação.

**ATENDE → ENTENDE → EXECUTA → RESOLVE → VENDE → APRENDE**

O objetivo é reduzir troca de ferramentas e permitir que um evento em uma área gere consequência nas demais.

## Fluxos conectados

### Comercial
Origem → contato → oportunidade → tarefa → conversa → venda ganha → recebimento → relatório.

### Atendimento
WhatsApp → fila → responsável → histórico → modelo/fluxo/IA → oportunidade ou resolução.

### Catálogo
Oferta → oportunidade → venda → faturamento.

### ONE Core
Não é um painel paralelo. Lê as tabelas e serviços existentes e apresenta:
- saúde de integrações;
- conversas sem responsável;
- tarefas vencidas;
- pipeline e forecast;
- origens de captação;
- automações/fluxos ativos;
- recebimentos pendentes.

## Público 360

Vertical com estatísticas territoriais agregadas, contatos, lideranças, demandas, eventos, agenda, geolocalização, comunicação informativa, ativos, simulação agregada e auditoria.

### Limites
- não registrar intenção de voto individual;
- não inferir preferência política;
- não classificar pessoas por ideologia/partido;
- não automatizar persuasão política personalizada;
- usar dados eleitorais oficiais somente em leitura agregada;
- comunicação exige finalidade permitida e consentimento quando aplicável.

## Dados reais x demo

A aplicação possui modos separados:
- **real**: autenticação Supabase + tenant; arrays começam vazios e só recebem o snapshot do banco;
- **demo**: entrada explícita e dados locais isolados.

Não existe fallback automático de produção para dados fictícios.

## UX

A navegação foi agrupada em Visão, Operação, Conversas, Inteligência, Vertical, Gestão e Administração. Guias de tela ficam recolhidos por padrão. A experiência móvel destaca as ações mais frequentes.

## Multissetor

A arquitetura é genérica por tenant. O segmento muda catálogo, pipeline, scripts, automações e indicadores — não exige outro CRM.
