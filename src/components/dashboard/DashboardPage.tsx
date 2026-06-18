import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { Badge } from '@/components/ui/Badge';
import { PIPELINE_STAGES } from '@/lib/crm/constants';
import { opportunityStatusBadgeStyle, taskStatusBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Screen, Task } from '@/types/crm';

type DashboardPageProps = {
  leads: Lead[];
  deals: Opportunity[];
  tasks: Task[];
  setScreen: (screen: Screen) => void;
};

export function DashboardPage({ leads, deals, tasks, setScreen }: DashboardPageProps) {
  const won = deals.filter((deal) => deal.status === 'Ganha');
  const open = deals.filter((deal) => deal.status === 'Aberta');
  const conversion = deals.length ? Math.round((won.length / deals.length) * 100) : 0;

  const metrics = [
    ['Leads novos', leads.length],
    ['Oportunidades abertas', open.length],
    ['Vendas fechadas', won.length],
    ['Valor em negociação', brl(open.reduce((total, deal) => total + deal.value, 0))],
    ['Taxa de conversão', `${conversion}%`],
    ['Tarefas vencidas', tasks.filter((task) => task.status === 'Vencida').length]
  ];

  return (
    <>
      <div className="grid metrics">
        {metrics.map(([label, value]) => (
          <div className="card metric" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>Atualizado agora</small>
          </div>
        ))}
      </div>

      <DashboardCharts leads={leads} />

      <div className="grid two-col">
        <div className="card pad">
          <div className="section-title">
            <h2>Funil por etapa</h2>
            <button className="btn small" onClick={() => setScreen('kanban')}>Ver Kanban</button>
          </div>
          <div className="report-bars">
            {PIPELINE_STAGES.map((stage) => {
              const count = deals.filter((deal) => deal.stage === stage).length;
              return (
                <div className="bar" key={stage}>
                  <span>
                    <b>{stage}</b>
                    <b>{count}</b>
                  </span>
                  <i style={{ width: `${Math.max(8, count * 22)}%` }} />
                </div>
              );
            })}
          </div>
        </div>

        <div className="card pad">
          <div className="section-title">
            <h2>Próximos follow-ups</h2>
            <span>{tasks.length} tarefas</span>
          </div>
          {tasks.map((task) => (
            <div className="timeline-item" key={task.id}>
              <b>{task.title}</b>
              <br />
              <span className="notice">{task.owner} • {task.due}</span>
              <div style={{ marginTop: 10 }}>
                <Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Oportunidades recentes</h2>
          <span>{deals.length} negócios</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Oportunidade</th>
                <th>Valor</th>
                <th>Etapa</th>
                <th>Responsável</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {deals.slice(0, 7).map((deal) => (
                <tr key={deal.id}>
                  <td>{deal.title}</td>
                  <td>{brl(deal.value)}</td>
                  <td>{deal.stage}</td>
                  <td>{deal.owner}</td>
                  <td><Badge style={opportunityStatusBadgeStyle(deal.status)}>{deal.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
