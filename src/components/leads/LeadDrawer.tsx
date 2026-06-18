import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS, LEAD_SOURCES } from '@/lib/crm/constants';
import { leadStatusBadgeStyle, opportunityStatusBadgeStyle, taskStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, LeadStatus, LeadTemperature, Opportunity, QuickMessage, Task } from '@/types/crm';

type LeadEditForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
  status: LeadStatus;
};

type LeadDrawerProps = {
  lead: Lead;
  deals: Opportunity[];
  tasks: Task[];
  messages: QuickMessage[];
  onClose: () => void;
  openConversation: (lead: Lead) => void;
  copyMessage: (message: QuickMessage, lead: Lead) => void;
  updateLead: (lead: Lead, form: LeadEditForm) => void | Promise<void>;
  addLeadNote: (lead: Lead, note: string) => void | Promise<void>;
};

const tabs = ['Resumo', 'Editar', 'Oportunidades', 'Histórico', 'Tarefas', 'Conversa'];
const users = CRM_USERS.map((user) => user.name);

function createEditForm(lead: Lead): LeadEditForm {
  return {
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    city: lead.city,
    source: lead.source,
    owner: lead.owner,
    temperature: lead.temperature,
    status: lead.status
  };
}

export function LeadDrawer({ lead, deals, tasks, messages, onClose, openConversation, copyMessage, updateLead, addLeadNote }: LeadDrawerProps) {
  const [tab, setTab] = useState('Resumo');
  const [editForm, setEditForm] = useState<LeadEditForm>(createEditForm(lead));
  const [note, setNote] = useState('');

  useEffect(() => {
    setEditForm(createEditForm(lead));
  }, [lead]);

  async function saveLeadChanges() {
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      alert('Nome e WhatsApp são obrigatórios.');
      return;
    }

    await updateLead(lead, editForm);
    alert('Ficha do cliente atualizada.');
  }

  async function saveNote() {
    if (!note.trim()) {
      alert('Escreva uma anotação antes de salvar.');
      return;
    }

    await addLeadNote(lead, note);
    setNote('');
  }

  return (
    <div className="drawer">
      <div className="drawer-panel">
        <div className="section-title">
          <div>
            <h1>{lead.name}</h1>
            <p className="notice">{lead.city} • {lead.source} • {lead.owner}</p>
          </div>
          <button className="btn" onClick={onClose}>Fechar</button>
        </div>

        <div>
          <Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge>{' '}
          <Badge style={leadStatusBadgeStyle(lead.status)}>{lead.status}</Badge>{' '}
          {lead.tags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
        </div>

        <div className="tabs">
          {tabs.map((item) => (
            <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>
              {item}
            </button>
          ))}
        </div>

        {tab === 'Resumo' && (
          <div className="card pad">
            <p><b>WhatsApp:</b> {lead.phone}</p>
            <p><b>E-mail:</b> {lead.email || 'Não informado'}</p>
            <p><b>Cidade:</b> {lead.city || 'Não informada'}</p>
            <p><b>Status:</b> {lead.status}</p>
            <button className="btn primary" onClick={() => openConversation(lead)}>Abrir conversa externa</button>{' '}
            <button className="btn" onClick={() => setTab('Editar')}>Editar ficha</button>
          </div>
        )}

        {tab === 'Editar' && (
          <div className="card pad">
            <div className="section-title">
              <h2>Editar ficha do cliente</h2>
              <span>Atualize dados cadastrais e status</span>
            </div>
            <div className="form-grid">
              <input className="input" placeholder="Nome" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
              <input className="input" placeholder="WhatsApp" value={editForm.phone} onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} />
              <input className="input" placeholder="E-mail" value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
              <input className="input" placeholder="Cidade" value={editForm.city} onChange={(event) => setEditForm({ ...editForm, city: event.target.value })} />
              <select className="select" value={editForm.source} onChange={(event) => setEditForm({ ...editForm, source: event.target.value })}>
                {LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}
              </select>
              <select className="select" value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })}>
                {users.map((user) => <option key={user}>{user}</option>)}
              </select>
              <select className="select" value={editForm.temperature} onChange={(event) => setEditForm({ ...editForm, temperature: event.target.value as LeadTemperature })}>
                <option>Quente</option>
                <option>Morno</option>
                <option>Frio</option>
              </select>
              <select className="select" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as LeadStatus })}>
                <option>Lead</option>
                <option>Cliente</option>
                <option>Inativo</option>
                <option>Arquivado</option>
              </select>
              <button className="btn primary" onClick={saveLeadChanges}>Salvar alterações</button>
            </div>
          </div>
        )}

        {tab === 'Oportunidades' && (
          <div className="grid">
            {deals.map((deal) => (
              <div className="timeline-item" key={deal.id}>
                <b>{deal.title}</b>
                <br />
                {brl(deal.value)} • {deal.stage} • <Badge style={opportunityStatusBadgeStyle(deal.status)}>{deal.status}</Badge>
              </div>
            ))}
          </div>
        )}

        {tab === 'Histórico' && (
          <div className="timeline">
            <div className="card pad">
              <div className="section-title">
                <h2>Nova anotação</h2>
                <span>Registre atendimento, retorno, dúvida ou observação</span>
              </div>
              <textarea className="input full" placeholder="Ex.: Cliente pediu retorno amanhã às 15h..." value={note} onChange={(event) => setNote(event.target.value)} style={{ minHeight: 90 }} />
              <button className="btn primary" onClick={saveNote}>Salvar anotação</button>
            </div>
            {lead.history.length ? lead.history.map((history, index) => (
              <div className="timeline-item" key={index}>{history}</div>
            )) : <div className="empty">Nenhum histórico registrado.</div>}
          </div>
        )}

        {tab === 'Tarefas' && (
          <div className="timeline">
            {tasks.length ? tasks.map((task) => (
              <div className="timeline-item" key={task.id}>
                <b>{task.title}</b>
                <br />
                {task.due} • <Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge>
              </div>
            )) : <div className="empty">Nenhuma tarefa vinculada.</div>}
          </div>
        )}

        {tab === 'Conversa' && (
          <div className="grid">
            <button className="btn primary" onClick={() => openConversation(lead)}>Abrir conversa externa</button>
            {messages.filter((message) => message.active).map((message) => (
              <div className="message-card" key={message.id}>
                <b>{message.title}</b>
                <p>{message.text}</p>
                <button className="btn small" onClick={() => copyMessage(message, lead)}>Copiar mensagem</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
