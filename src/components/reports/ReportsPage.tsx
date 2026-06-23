import { CRM_USERS, LEAD_SOURCES } from '@/lib/crm/constants';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Task } from '@/types/crm';

type ReportsPageProps = {
  leads: Lead[];
  deals: Opportunity[];
  tasks: Task[];
};

const users = CRM_USERS.map((user) => user.name);

function percent(value: number) {
  return `${Math.round(value)}%`;
}

function probability(deal: Opportunity) {
  if (typeof deal.probability === 'number') return deal.probability;
  if (deal.status === 'Ganha') return 100;
  if (deal.status === 'Perdida') return 0;
  return 30;
}

function maxNumber(values: number[]) {
  return Math.max(1, ...values);
}

export function ReportsPage({ leads, deals, tasks }: ReportsPageProps) {
  const wonDeals = deals.filter((deal) => deal.status === 'Ganha');
  const lostDeals = deals.filter((deal) => deal.status === 'Perdida');
  const openDeals = deals.filter((deal) => deal.status === 'Aberta');
  const soldValue = wonDeals.reduce((total, deal) => total + deal.value, 0);
  const openValue = openDeals.reduce((total, deal) => total + deal.value, 0);
  const forecastValue = openDeals.reduce((total, deal) => total + (deal.value * probability(deal) / 100), 0);
  const conversionRate = deals.length ? wonDeals.length / deals.length * 100 : 0;
  const averageTicket = wonDeals.length ? soldValue / wonDeals.length : 0;
  const completedTasks = tasks.filter((task) => task.status === 'Concluída').length;
  const taskRate = tasks.length ? completedTasks / tasks.length * 100 : 0;

  const sourceCounts = LEAD_SOURCES.map((source) => ({ name: source, value: leads.filter((lead) => lead.source === source).length }));
  const sourceMax = maxNumber(sourceCounts.map((item) => item.value));
  const temperatures = ['Quente', 'Morno', 'Frio'].map((temperature) => ({ name: temperature, value: leads.filter((lead) => lead.temperature === temperature).length }));
  const stages = Array.from(new Set(deals.map((deal) => deal.stage))).map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage);
    return { name: stage, count: stageDeals.length, value: stageDeals.reduce((total, deal) => total + deal.value, 0) };
  });
  const stageMax = maxNumber(stages.map((stage) => stage.value));
  const sellers = users.map((user) => {
    const userDeals = deals.filter((deal) => deal.owner === user);
    const userWon = userDeals.filter((deal) => deal.status === 'Ganha');
    return { name: user, value: userWon.reduce((total, deal) => total + deal.value, 0), count: userDeals.length, won: userWon.length };
  }).sort((a, b) => b.value - a.value);
  const sellerMax = maxNumber(sellers.map((seller) => seller.value));

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card pad" style={{ background: 'linear-gradient(135deg, #005954 0%, #338b85 50%, #5dc1b9 100%)', color: '#ffffff' }}>
        <div className="section-title" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ color: '#ffffff' }}>Relatórios premium</h2>
            <p style={{ color: 'rgba(255,255,255,.82)', marginTop: 6 }}>Visão executiva para venda, gestão e tomada de decisão comercial.</p>
          </div>
          <span>Fase 9 ativa</span>
        </div>
        <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 18 }}>
          <div className="metric"><span>Valor vendido</span><strong>{brl(soldValue)}</strong><small>{wonDeals.length} venda(s)</small></div>
          <div className="metric"><span>Em negociação</span><strong>{brl(openValue)}</strong><small>{openDeals.length} aberta(s)</small></div>
          <div className="metric"><span>Previsão ponderada</span><strong>{brl(forecastValue)}</strong><small>valor x chance</small></div>
          <div className="metric"><span>Conversão</span><strong>{percent(conversionRate)}</strong><small>{wonDeals.length}/{deals.length}</small></div>
          <div className="metric"><span>Ticket médio</span><strong>{brl(averageTicket)}</strong><small>vendas fechadas</small></div>
          <div className="metric"><span>Tarefas concluídas</span><strong>{percent(taskRate)}</strong><small>{completedTasks}/{tasks.length}</small></div>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card pad"><div className="section-title"><h2>Leads por origem</h2><span>Captação</span></div><div className="report-bars">{sourceCounts.map((source) => <div className="bar" key={source.name}><span><b>{source.name}</b><b>{source.value}</b></span><i style={{ width: `${Math.max(8, source.value / sourceMax * 100)}%` }} /></div>)}</div></div>
        <div className="card pad"><div className="section-title"><h2>Temperatura dos leads</h2><span>Prioridade</span></div><div style={{ display: 'grid', gap: 12 }}>{temperatures.map((item) => <div className="timeline-item" key={item.name} style={{ margin: 0 }}><div className="section-title"><b>{item.name}</b><span>{item.value}</span></div><div style={{ height: 8, borderRadius: 999, background: '#e5f8f6', overflow: 'hidden' }}><div style={{ width: `${Math.max(8, leads.length ? item.value / leads.length * 100 : 0)}%`, height: '100%', background: item.name === 'Quente' ? '#ef4444' : item.name === 'Morno' ? '#f59e0b' : '#0ea5e9' }} /></div></div>)}</div></div>
      </div>

      <div className="grid two-col">
        <div className="card pad"><div className="section-title"><h2>Funil por etapa</h2><span>Valor em pipeline</span></div><div style={{ display: 'grid', gap: 12 }}>{stages.map((stage) => <div className="timeline-item" key={stage.name} style={{ margin: 0 }}><div className="section-title"><b>{stage.name}</b><span>{brl(stage.value)}</span></div><p className="notice">{stage.count} oportunidade(s)</p><div style={{ height: 8, borderRadius: 999, background: '#e5f8f6', overflow: 'hidden' }}><div style={{ width: `${Math.max(8, stage.value / stageMax * 100)}%`, height: '100%', background: '#338b85' }} /></div></div>)}</div></div>
        <div className="card pad"><div className="section-title"><h2>Ranking comercial</h2><span>Performance</span></div><div className="report-bars">{sellers.map((seller) => <div className="bar" key={seller.name}><span><b>{seller.name}</b><b>{brl(seller.value)}</b></span><i style={{ width: `${Math.max(8, seller.value / sellerMax * 100)}%` }} /><small className="notice">{seller.count} oportunidade(s) • {seller.won} ganha(s)</small></div>)}</div></div>
      </div>

      <div className="grid two-col">
        <div className="card pad"><div className="section-title"><h2>Resumo comercial</h2><span>Direção</span></div><p>Vendas ganhas: <b>{wonDeals.length}</b></p><p>Vendas perdidas: <b>{lostDeals.length}</b></p><p>Oportunidades abertas: <b>{openDeals.length}</b></p><p>Tarefas vencidas: <b>{tasks.filter((task) => task.status === 'Vencida').length}</b></p></div>
        <div className="card pad"><div className="section-title"><h2>Leitura executiva</h2><span>Decisão rápida</span></div><div className="timeline-item"><b>Onde acelerar</b><p className="notice">Priorize oportunidades abertas com maior valor e maior probabilidade. A previsão ponderada mostra quanto pode entrar considerando a chance de fechamento.</p></div><div className="timeline-item"><b>Onde corrigir</b><p className="notice">Acompanhe tarefas vencidas, oportunidades perdidas e origens com baixa captação para ajustar campanha, atendimento e follow-up.</p></div></div>
      </div>
    </div>
  );
}
