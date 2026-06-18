import { Badge } from '@/components/ui/Badge';
import { PIPELINE_STAGES } from '@/lib/crm/constants';
import { taskStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, PipelineStage } from '@/types/crm';

type KanbanPageProps = {
  leads: Lead[];
  deals: Opportunity[];
  moveDeal: (id: number, stage: PipelineStage) => void;
  markWon: (id: number) => void;
  markLost: (id: number) => void;
  openConversation: (lead: Lead) => void;
  setSelectedLead: (lead: Lead) => void;
};

export function KanbanPage({ leads, deals, moveDeal, markWon, markLost, openConversation, setSelectedLead }: KanbanPageProps) {
  function leadById(id: number) {
    return leads.find((lead) => lead.id === id);
  }

  return (
    <div className="kanban">
      {PIPELINE_STAGES.map((stage) => (
        <div className="column" key={stage}>
          <div className="column-head">
            <span>{stage}</span>
            <b>{deals.filter((deal) => deal.stage === stage).length}</b>
          </div>

          {deals
            .filter((deal) => deal.stage === stage)
            .map((deal) => {
              const lead = leadById(deal.leadId);
              if (!lead) return null;

              return (
                <div className="deal-card" key={deal.id}>
                  <strong>{lead.name}</strong>
                  <div className="deal-meta">
                    <span>{deal.title}</span>
                    <b>{brl(deal.value)}</b>
                  </div>
                  <div>
                    <Badge style={tempBadgeStyle(deal.temperature)}>{deal.temperature}</Badge>{' '}
                    {deal.late && <Badge style={taskStatusBadgeStyle('Vencida')}>Atrasado</Badge>}
                  </div>
                  <div className="deal-meta">
                    <span>{deal.owner}</span>
                    <span>{deal.source}</span>
                  </div>
                  <small className="notice">Próxima ação: {deal.nextTask}</small>
                  <select className="select" value={deal.stage} onChange={(event) => moveDeal(deal.id, event.target.value as PipelineStage)}>
                    {PIPELINE_STAGES.map((pipelineStage) => (
                      <option key={pipelineStage}>{pipelineStage}</option>
                    ))}
                  </select>
                  <div className="deal-actions">
                    <button className="btn small" onClick={() => setSelectedLead(lead)}>Abrir</button>
                    <button className="btn small" onClick={() => openConversation(lead)}>Conversa</button>
                    <button className="btn small success" onClick={() => markWon(deal.id)}>Ganha</button>
                    <button className="btn small danger" onClick={() => markLost(deal.id)}>Perdida</button>
                  </div>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
