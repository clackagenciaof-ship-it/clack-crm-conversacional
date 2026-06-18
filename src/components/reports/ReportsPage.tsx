import { CRM_USERS, LEAD_SOURCES } from '@/lib/crm/constants';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Task } from '@/types/crm';

type ReportsPageProps = {
  leads: Lead[];
  deals: Opportunity[];
  tasks: Task[];
};

const users = CRM_USERS.map((user) => user.name);

export function ReportsPage({ leads, deals, tasks }: ReportsPageProps) {
  const sourceCounts = LEAD_SOURCES.map((source) => ({
    name: source,
    count: leads.filter((lead) => lead.source === source).length
  }));

  const sellerSales = users.map((user) => ({
    name: user,
    value: deals.filter((deal) => deal.owner === user && deal.status === 'Ganha').reduce((total, deal) => total + deal.value, 0)
  }));

  return (
    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title">
          <h2>Leads por origem</h2>
          <span>Captação</span>
        </div>
        <div className="report-bars">
          {sourceCounts.map((source) => (
            <div className="bar" key={source.name}>
              <span>
                <b>{source.name}</b>
                <b>{source.count}</b>
              </span>
              <i style={{ width: `${Math.max(8, source.count * 18)}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <h2>Resumo comercial</h2>
        <p>Vendas ganhas: <b>{deals.filter((deal) => deal.status === 'Ganha').length}</b></p>
        <p>Vendas perdidas: <b>{deals.filter((deal) => deal.status === 'Perdida').length}</b></p>
        <p>Valor vendido: <b>{brl(deals.filter((deal) => deal.status === 'Ganha').reduce((total, deal) => total + deal.value, 0))}</b></p>
        <p>Tarefas vencidas: <b>{tasks.filter((task) => task.status === 'Vencida').length}</b></p>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Ranking de vendedores</h2>
        </div>
        <div className="report-bars">
          {sellerSales.map((seller) => (
            <div className="bar" key={seller.name}>
              <span>
                <b>{seller.name}</b>
                <b>{brl(seller.value)}</b>
              </span>
              <i style={{ width: `${Math.max(10, seller.value / 20)}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
