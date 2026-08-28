"use client";

import type { Lead, Opportunity, Task } from "@/types/crm";

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function probabilityFor(deal: Opportunity) {
  if (typeof deal.probability === "number") return Math.max(0, Math.min(100, deal.probability));
  const stage = (deal.stage || "").toLowerCase();
  if (deal.status === "Ganha") return 100;
  if (deal.status === "Perdida") return 0;
  if (stage.includes("negocia")) return 75;
  if (stage.includes("proposta")) return 60;
  if (stage.includes("qualifica")) return 40;
  return 25;
}

export function IntelligencePage({ leads, deals, tasks }: { leads: Lead[]; deals: Opportunity[]; tasks: Task[] }) {
  const openDeals = deals.filter((deal) => deal.status === "Aberta");
  const wonDeals = deals.filter((deal) => deal.status === "Ganha");
  const pipeline = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const weighted = openDeals.reduce((sum, deal) => sum + Number(deal.value || 0) * (probabilityFor(deal) / 100), 0);
  const revenue = wonDeals.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const lateTasks = tasks.filter((task) => task.status === "Vencida").length;
  const hotLeads = leads.filter((lead) => lead.temperature === "Quente").length;

  const sources = Object.entries(
    leads.reduce<Record<string, number>>((acc, lead) => {
      const key = lead.source || "Não informado";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const actions = [
    lateTasks > 0 ? { title: "Recuperar follow-ups vencidos", detail: `${lateTasks} tarefa(s) precisam de ação imediata.`, priority: "Alta" } : null,
    hotLeads > 0 ? { title: "Atacar leads quentes", detail: `${hotLeads} lead(s) estão marcados como Quente.`, priority: "Alta" } : null,
    openDeals.length > 0 ? { title: "Acelerar pipeline", detail: `${openDeals.length} oportunidade(s) abertas somam ${money(pipeline)}.`, priority: "Média" } : null,
    sources[0] ? { title: "Otimizar OmniRoute", detail: `${sources[0][0]} é a principal origem atual, com ${sources[0][1]} lead(s).`, priority: "Média" } : null
  ].filter(Boolean) as Array<{ title: string; detail: string; priority: string }>;

  return (
    <div className="grid" style={{ gap: 16 }}>
      <section className="grid metrics">
        <div className="card metric"><span>Pipeline aberto</span><strong>{money(pipeline)}</strong><small>{openDeals.length} oportunidades</small></div>
        <div className="card metric"><span>Forecast ponderado</span><strong>{money(weighted)}</strong><small>probabilidade por etapa</small></div>
        <div className="card metric"><span>Receita ganha</span><strong>{money(revenue)}</strong><small>{wonDeals.length} vendas</small></div>
        <div className="card metric"><span>Leads quentes</span><strong>{hotLeads}</strong><small>prioridade comercial</small></div>
        <div className="card metric"><span>Follow-ups vencidos</span><strong>{lateTasks}</strong><small>risco de perda</small></div>
        <div className="card metric"><span>Origens ativas</span><strong>{sources.length}</strong><small>OmniRoute</small></div>
      </section>

      <section className="grid two-col">
        <div className="card pad">
          <div className="section-title">
            <div><h2>ONE Intelligence · Next Best Action</h2><span>Prioridades calculadas sobre a operação atual</span></div>
          </div>
          <div className="timeline">
            {actions.length ? actions.map((action) => (
              <div className="timeline-item" key={action.title}>
                <strong>{action.title}</strong>
                <p style={{ margin: "7px 0 0" }}>{action.detail}</p>
                <span className="badge status" style={{ marginTop: 8 }}>Prioridade {action.priority}</span>
              </div>
            )) : <p className="notice">Sem alertas críticos. Continue alimentando o CRM para ampliar a inteligência operacional.</p>}
          </div>
        </div>

        <div className="card pad">
          <div className="section-title">
            <div><h2>OmniRoute</h2><span>Captação e roteamento por origem</span></div>
          </div>
          <div className="report-bars">
            {sources.slice(0, 8).map(([source, count]) => {
              const pct = leads.length ? Math.round((count / leads.length) * 100) : 0;
              return <div className="bar" key={source}><span><b>{source}</b><small>{count} · {pct}%</small></span><i style={{ width: `${Math.max(8, pct)}%` }} /></div>;
            })}
          </div>
        </div>
      </section>

      <section className="grid two-col">
        <div className="card pad">
          <div className="section-title"><div><h2>Customer 360</h2><span>Visão unificada de relacionamento, venda e execução</span></div></div>
          <p className="notice">O CLACK passa a usar os princípios do ONE CORE para consolidar contexto do cliente, oportunidade, tarefas, atendimento e receita em uma única leitura operacional.</p>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            <div className="message-card"><strong>Contexto</strong><span>{leads.length} contatos organizados com origem, responsável, temperatura e histórico.</span></div>
            <div className="message-card"><strong>Resolução</strong><span>{wonDeals.length} oportunidades concluídas como ganho e {tasks.filter(t => t.status === "Concluída").length} tarefas concluídas.</span></div>
            <div className="message-card"><strong>Receita</strong><span>Pipeline, forecast ponderado, ganhos e próximos passos em uma camada executiva.</span></div>
            <div className="message-card"><strong>Governança</strong><span>Ações críticas continuam sujeitas a perfil, RLS, consentimento e auditoria.</span></div>
          </div>
        </div>

        <div className="card pad">
          <div className="section-title"><div><h2>Integration Hub</h2><span>Camada preparada para conectores</span></div></div>
          <div className="timeline">
            <div className="timeline-item"><strong>WhatsApp / Atendimento</strong><p>Conversas, fila, respostas rápidas e histórico comercial.</p></div>
            <div className="timeline-item"><strong>Supabase</strong><p>Auth, PostgreSQL, RLS e persistência multiempresa.</p></div>
            <div className="timeline-item"><strong>Vercel</strong><p>Deploy, CDN, observabilidade e entrega contínua.</p></div>
            <div className="timeline-item"><strong>Formulários e landing pages</strong><p>Entradas podem ser padronizadas como origens OmniRoute para distribuição e acompanhamento.</p></div>
          </div>
        </div>
      </section>
    </div>
  );
}
