import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS, LEAD_SOURCES, PIPELINE_STAGES } from '@/lib/crm/constants';
import { opportunityStatusBadgeStyle, taskStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage } from '@/types/crm';

type OpportunityEditForm = {
  title: string;
  value: number;
  stage: PipelineStage;
  owner: string;
  source: string;
  temperature: LeadTemperature;
  nextTask: string;
  status: OpportunityStatus;
  notes: string;
};

type KanbanPageProps = {
  leads: Lead[];
  deals: Opportunity[];
  moveDeal: (id: number, stage: PipelineStage) => void;
  updateDeal: (deal: Opportunity, form: OpportunityEditForm) => void | Promise<void>;
  markWon: (id: number) => void;
  markLost: (id: number) => void;
  openConversation: (lead: Lead) => void;
  setSelectedLead: (lead: Lead) => void;
};

const users = CRM_USERS.map((user) => user.name);
const opportunityStatuses: OpportunityStatus[] = ['Aberta', 'Ganha', 'Perdida', 'Arquivada'];

function createEditForm(deal: Opportunity): OpportunityEditForm {
  return {
    title: deal.title,
    value: deal.value,
    stage: deal.stage,
    owner: deal.owner,
    source: deal.source,
    temperature: deal.temperature,
    nextTask: deal.nextTask,
    status: deal.status,
    notes: deal.notes
  };
}

function parseCurrencyValue(value: string) {
  const normalized = value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '');
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function KanbanPage({ leads, deals, moveDeal, updateDeal, markWon, markLost, openConversation, setSelectedLead }: KanbanPageProps) {
  const [editingDealId, setEditingDealId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<OpportunityEditForm | null>(null);

  function leadById(id: number) {
    return leads.find((lead) => lead.id === id);
  }

  function startEdit(deal: Opportunity) {
    setEditingDealId(deal.id);
    setEditForm(createEditForm(deal));
  }

  async function saveDeal(deal: Opportunity) {
    if (!editForm?.title.trim()) {
      alert('A oportunidade precisa de título.');
      return;
    }

    await updateDeal(deal, editForm);
    setEditingDealId(null);
    setEditForm(null);
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
                  {editingDealId === deal.id && editForm ? (
                    <div className="form-grid">
                      <strong>{lead.name}</strong>
                      <input className="input full" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                      <label className="currency-field">
                        <span>R$</span>
                        <input
                          className="input"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={editForm.value === 0 ? '' : String(editForm.value).replace('.', ',')}
                          onChange={(event) => setEditForm({ ...editForm, value: parseCurrencyValue(event.target.value) })}
                        />
                      </label>
                      <select className="select" value={editForm.stage} onChange={(event) => setEditForm({ ...editForm, stage: event.target.value as PipelineStage, status: event.target.value === 'Fechado' ? 'Ganha' : event.target.value === 'Perdido' ? 'Perdida' : 'Aberta' })}>
                        {PIPELINE_STAGES.map((pipelineStage) => <option key={pipelineStage}>{pipelineStage}</option>)}
                      </select>
                      <select className="select" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as OpportunityStatus })}>
                        {opportunityStatuses.map((status) => <option key={status}>{status}</option>)}
                      </select>
                      <select className="select" value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })}>
                        {users.map((user) => <option key={user}>{user}</option>)}
                      </select>
                      <select className="select" value={editForm.source} onChange={(event) => setEditForm({ ...editForm, source: event.target.value })}>
                        {LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}
                      </select>
                      <select className="select" value={editForm.temperature} onChange={(event) => setEditForm({ ...editForm, temperature: event.target.value as LeadTemperature })}>
                        <option>Quente</option>
                        <option>Morno</option>
                        <option>Frio</option>
                      </select>
                      <input className="input full" placeholder="Próxima ação" value={editForm.nextTask} onChange={(event) => setEditForm({ ...editForm, nextTask: event.target.value })} />
                      <textarea className="input full" placeholder="Observações" value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} style={{ minHeight: 80 }} />
                      <button className="btn small primary" onClick={() => saveDeal(deal)}>Salvar</button>
                      <button className="btn small" onClick={() => { setEditingDealId(null); setEditForm(null); }}>Cancelar</button>
                    </div>
                  ) : (
                    <>
                      <strong>{lead.name}</strong>
                      <div className="deal-meta">
                        <span>{deal.title}</span>
                        <b>{brl(deal.value)}</b>
                      </div>
                      <div>
                        <Badge style={tempBadgeStyle(deal.temperature)}>{deal.temperature}</Badge>{' '}
                        <Badge style={opportunityStatusBadgeStyle(deal.status)}>{deal.status}</Badge>{' '}
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
                        <button className="btn small" onClick={() => startEdit(deal)}>Editar</button>
                        <button className="btn small" onClick={() => openConversation(lead)}>Conversa</button>
                        <button className="btn small success" onClick={() => markWon(deal.id)}>Ganha</button>
                        <button className="btn small danger" onClick={() => markLost(deal.id)}>Perdida</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
