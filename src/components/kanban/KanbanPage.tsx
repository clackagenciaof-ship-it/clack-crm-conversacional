import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS, LEAD_SOURCES, PIPELINE_STAGES } from '@/lib/crm/constants';
import { opportunityStatusBadgeStyle, taskStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import { loadCompanyPipelineStages } from '@/lib/crm/pipeline-admin';
import type { Lead, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage } from '@/types/crm';

type OpportunityEditForm = {
  title: string; value: number; stage: PipelineStage; owner: string; source: string;
  temperature: LeadTemperature; nextTask: string; status: OpportunityStatus; notes: string;
  probability?: number; expectedCloseDate?: string;
};
type KanbanPageProps = {
  leads: Lead[]; deals: Opportunity[]; moveDeal: (id: number, stage: PipelineStage) => void;
  updateDeal: (deal: Opportunity, form: OpportunityEditForm) => void | Promise<void>;
  markWon: (id: number) => void; markLost: (id: number) => void;
  openConversation: (lead: Lead) => void; setSelectedLead: (lead: Lead) => void;
};
const users = CRM_USERS.map((user) => user.name);
const statuses: OpportunityStatus[] = ['Aberta', 'Ganha', 'Perdida', 'Arquivada'];
const editFor = (deal: Opportunity): OpportunityEditForm => ({
  title: deal.title, value: deal.value, stage: deal.stage, owner: deal.owner, source: deal.source,
  temperature: deal.temperature, nextTask: deal.nextTask, status: deal.status, notes: deal.notes,
  probability: deal.probability || 20, expectedCloseDate: deal.expectedCloseDate || ''
});
function parseCurrencyValue(value: string) {
  const parsed = Number(value.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
function probability(stage: string, dynamic: Array<{name:string; probability?:number|null}>) {
  return dynamic.find((item) => item.name === stage)?.probability ?? 20;
}

export function KanbanPage({ leads, deals, moveDeal, updateDeal, markWon, markLost, openConversation, setSelectedLead }: KanbanPageProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<OpportunityEditForm | null>(null);
  const [dynamicStages, setDynamicStages] = useState<Array<{ name: string; probability?: number | null }>>([]);
  const [view, setView] = useState<'ativas'|'todas'>('ativas');

  useEffect(() => {
    let cancelled = false;
    loadCompanyPipelineStages().then((rows) => {
      if (!cancelled && rows.length) setDynamicStages(rows.map((row) => ({ name: row.name, probability: row.probability })));
    }).catch(() => !cancelled && setDynamicStages([]));
    return () => { cancelled = true; };
  }, []);

  const stages = useMemo(() => {
    const base = dynamicStages.length ? dynamicStages.map((item) => item.name) : PIPELINE_STAGES;
    const fromDeals = deals.map((deal) => deal.stage).filter(Boolean);
    return Array.from(new Set([...base, ...fromDeals]));
  }, [dynamicStages, deals]);

  const visibleDeals = view === 'ativas' ? deals.filter((deal) => deal.status === 'Aberta') : deals;
  const visibleStages = stages.filter((stage) => visibleDeals.some((deal) => deal.stage === stage));
  const boardStages = visibleStages.length ? visibleStages : stages.slice(0, 1);
  const openValue = deals.filter((d) => d.status === 'Aberta').reduce((sum,d) => sum + Number(d.value || 0), 0);
  const wonValue = deals.filter((d) => d.status === 'Ganha').reduce((sum,d) => sum + Number(d.value || 0), 0);

  function leadById(id: number) { return leads.find((lead) => lead.id === id); }
  async function save(deal: Opportunity) {
    if (!editForm?.title.trim()) return alert('A oportunidade precisa de título.');
    await updateDeal(deal, editForm);
    setEditingId(null); setEditForm(null);
  }

  return (
    <div className="workspace-stack">
      <section className="grid metrics compact-metrics">
        <div className="card metric"><span>Em andamento</span><strong>{deals.filter(d => d.status === 'Aberta').length}</strong><small>{brl(openValue)}</small></div>
        <div className="card metric"><span>Ganhas</span><strong>{deals.filter(d => d.status === 'Ganha').length}</strong><small>{brl(wonValue)}</small></div>
        <div className="card metric"><span>Perdidas</span><strong>{deals.filter(d => d.status === 'Perdida').length}</strong><small>aprendizado comercial</small></div>
      </section>

      <div className="toolbar">
        <div><b>Pipeline operacional</b><span className="notice">Mostra por padrão somente negócios em andamento.</span></div>
        <div className="segmented"><button className={view === 'ativas' ? 'active' : ''} onClick={() => setView('ativas')}>Ativas</button><button className={view === 'todas' ? 'active' : ''} onClick={() => setView('todas')}>Todas</button></div>
      </div>

      <div className="kanban kanban-clean">
        {boardStages.map((stage) => {
          const stageDeals = visibleDeals.filter((deal) => deal.stage === stage);
          return <section className="column" key={stage}>
            <div className="column-head"><div><span>{stage}</span><small>{brl(stageDeals.reduce((sum,d) => sum + Number(d.value || 0),0))}</small></div><b>{stageDeals.length}</b></div>
            {stageDeals.map((deal) => {
              const lead = leadById(deal.leadId);
              if (!lead) return null;
              const pct = deal.probability ?? probability(stage, dynamicStages);
              return <article className="deal-card" key={deal.id}>
                {editingId === deal.id && editForm ? <div className="form-grid">
                  <strong className="full">{lead.name}</strong>
                  <input className="input full" value={editForm.title} onChange={e => setEditForm({...editForm,title:e.target.value})}/>
                  <label className="currency-field"><span>R$</span><input className="input" value={editForm.value ? String(editForm.value).replace('.',',') : ''} onChange={e => setEditForm({...editForm,value:parseCurrencyValue(e.target.value)})}/></label>
                  <select className="select" value={editForm.stage} onChange={e => setEditForm({...editForm,stage:e.target.value,probability:probability(e.target.value,dynamicStages)})}>{stages.map(s => <option key={s}>{s}</option>)}</select>
                  <select className="select" value={editForm.status} onChange={e => setEditForm({...editForm,status:e.target.value as OpportunityStatus})}>{statuses.map(s => <option key={s}>{s}</option>)}</select>
                  <input className="input" type="number" min="0" max="100" value={editForm.probability || 0} onChange={e => setEditForm({...editForm,probability:Number(e.target.value||0)})}/>
                  <input className="input" type="date" value={editForm.expectedCloseDate || ''} onChange={e => setEditForm({...editForm,expectedCloseDate:e.target.value})}/>
                  <select className="select" value={editForm.owner} onChange={e => setEditForm({...editForm,owner:e.target.value})}>{users.map(u => <option key={u}>{u}</option>)}</select>
                  <select className="select" value={editForm.source} onChange={e => setEditForm({...editForm,source:e.target.value})}>{LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}</select>
                  <input className="input full" placeholder="Próxima ação" value={editForm.nextTask} onChange={e => setEditForm({...editForm,nextTask:e.target.value})}/>
                  <textarea className="textarea full" placeholder="Observações" value={editForm.notes} onChange={e => setEditForm({...editForm,notes:e.target.value})}/>
                  <button className="btn small primary" onClick={() => save(deal)}>Salvar</button><button className="btn small" onClick={() => {setEditingId(null);setEditForm(null)}}>Cancelar</button>
                </div> : <>
                  <div className="deal-title"><strong>{lead.name}</strong><b>{brl(deal.value)}</b></div>
                  <span className="deal-subtitle">{deal.title}</span>
                  <div className="badge-line"><Badge style={tempBadgeStyle(deal.temperature)}>{deal.temperature}</Badge><Badge style={opportunityStatusBadgeStyle(deal.status)}>{pct}%</Badge>{deal.late && <Badge style={taskStatusBadgeStyle('Vencida')}>Atrasado</Badge>}</div>
                  <small className="notice">{deal.owner} · {deal.source}</small>
                  <div className="next-action"><small>Próxima ação</small><b>{deal.nextTask || 'Definir próximo passo'}</b></div>
                  <select className="select" value={deal.stage} onChange={e => moveDeal(deal.id,e.target.value)}>{stages.map(s => <option key={s}>{s}</option>)}</select>
                  <div className="deal-actions"><button className="btn small" onClick={() => setSelectedLead(lead)}>Ficha</button><button className="btn small" onClick={() => openConversation(lead)}>WhatsApp</button><button className="btn small" onClick={() => {setEditingId(deal.id);setEditForm(editFor(deal))}}>Editar</button><button className="btn small success" onClick={() => markWon(deal.id)}>Ganha</button><button className="btn small danger" onClick={() => markLost(deal.id)}>Perdida</button></div>
                </>}
              </article>;
            })}
            {!stageDeals.length && <div className="empty mini">Sem negócios nesta etapa.</div>}
          </section>;
        })}
      </div>
      {!deals.length && <div className="card pad empty">Nenhuma oportunidade. Cadastre um contato real para iniciar o pipeline.</div>}
    </div>
  );
}
