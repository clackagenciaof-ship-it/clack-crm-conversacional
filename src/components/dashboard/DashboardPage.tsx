import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Badge } from '@/components/ui/Badge';
import { opportunityStatusBadgeStyle, taskStatusBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Screen, Task } from '@/types/crm';

type DashboardPageProps = { leads: Lead[]; deals: Opportunity[]; tasks: Task[]; setScreen: (screen: Screen) => void; };

export function DashboardPage({ leads, deals, tasks, setScreen }: DashboardPageProps) {
  const won = deals.filter((deal) => deal.status === 'Ganha');
  const open = deals.filter((deal) => deal.status === 'Aberta');
  const pipeline = open.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const wonValue = won.reduce((sum, deal) => sum + Number(deal.value || 0), 0);
  const conversion = deals.length ? Math.round((won.length / deals.length) * 100) : 0;
  const pending = tasks.filter((task) => task.status !== 'Concluída' && task.status !== 'Cancelada');
  const priorityTasks = [...pending].sort((a, b) => {
    const weight = (task: Task) => (task.status === 'Vencida' ? 100 : 0) + (task.priority === 'Alta' ? 30 : task.priority === 'Média' ? 20 : 10);
    return weight(b) - weight(a);
  }).slice(0, 5);

  const stageCounts = Object.entries(open.reduce<Record<string, number>>((acc, deal) => {
    acc[deal.stage || 'Sem etapa'] = (acc[deal.stage || 'Sem etapa'] || 0) + 1;
    return acc;
  }, {}));
  const maxStage = Math.max(...stageCounts.map(([, count]) => count), 1);

  return (
    <div className="workspace-stack">
      <section className="grid metrics executive-metrics">
        <div className="card metric"><span>Contatos</span><strong>{leads.length}</strong><small>base atual</small></div>
        <div className="card metric"><span>Pipeline aberto</span><strong>{brl(pipeline)}</strong><small>{open.length} oportunidades</small></div>
        <div className="card metric"><span>Receita ganha</span><strong>{brl(wonValue)}</strong><small>{won.length} vendas</small></div>
        <div className="card metric"><span>Conversão</span><strong>{conversion}%</strong><small>ganhas / negócios</small></div>
        <div className="card metric"><span>Follow-ups</span><strong>{pending.length}</strong><small>pendentes</small></div>
      </section>

      <div className="quick-strip">
        <button onClick={() => setScreen('leads')}>Captar / cadastrar</button>
        <button onClick={() => setScreen('kanban')}>Avançar pipeline</button>
        <button onClick={() => setScreen('inbox')}>Responder conversas</button>
        <button onClick={() => setScreen('intelligence')}>Abrir ONE Core</button>
      </div>

      <DashboardCharts leads={leads} />

      <section className="grid two-col dashboard-core">
        <div className="card pad">
          <div className="section-title"><div><h2>Pipeline por etapa</h2><span>{open.length} em andamento</span></div><button className="btn small" onClick={() => setScreen('kanban')}>Abrir pipeline</button></div>
          <div className="report-bars">
            {stageCounts.length ? stageCounts.map(([stage, count]) => <div className="bar" key={stage}><span><b>{stage}</b><small>{count}</small></span><i style={{ width: `${Math.max(8, (count / maxStage) * 100)}%` }} /></div>) : <div className="empty">Sem oportunidades abertas.</div>}
          </div>
        </div>

        <div className="card pad compact-followups">
          <div className="section-title"><div><h2>Prioridades de hoje</h2><span>máximo 5</span></div><button className="btn small" onClick={() => setScreen('tasks')}>Ver todas</button></div>
          <div className="compact-list">
            {priorityTasks.map((task) => <div className="compact-row" key={task.id}><div><b>{task.title}</b><small>{task.leadName || task.owner} · {task.due || 'Sem prazo'}</small></div><Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge></div>)}
            {!priorityTasks.length && <div className="empty">Nenhum follow-up pendente.</div>}
          </div>
        </div>
      </section>

      <section className="card pad">
        <div className="section-title"><div><h2>Negócios recentes</h2><span>visão conectada ao pipeline</span></div></div>
        <div className="table-wrap"><table><thead><tr><th>Oportunidade</th><th>Valor</th><th>Etapa</th><th>Responsável</th><th>Status</th></tr></thead><tbody>
          {deals.slice(0, 7).map((deal) => <tr key={deal.id}><td>{deal.title}</td><td>{brl(deal.value)}</td><td>{deal.stage}</td><td>{deal.owner}</td><td><Badge style={opportunityStatusBadgeStyle(deal.status)}>{deal.status}</Badge></td></tr>)}
        </tbody></table></div>
        {!deals.length && <div className="empty">Sua empresa começa vazia. Cadastre o primeiro contato para iniciar o pipeline.</div>}
      </section>
    </div>
  );
}
