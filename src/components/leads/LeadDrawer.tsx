import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { leadStatusBadgeStyle, opportunityStatusBadgeStyle, taskStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

type LeadDrawerProps = {
  lead: Lead;
  deals: Opportunity[];
  tasks: Task[];
  messages: QuickMessage[];
  onClose: () => void;
  openConversation: (lead: Lead) => void;
  copyMessage: (message: QuickMessage, lead: Lead) => void;
};

const tabs = ['Resumo', 'Oportunidades', 'Histórico', 'Tarefas', 'Conversa'];

export function LeadDrawer({ lead, deals, tasks, messages, onClose, openConversation, copyMessage }: LeadDrawerProps) {
  const [tab, setTab] = useState('Resumo');

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
            <p><b>E-mail:</b> {lead.email}</p>
            <p><b>Status:</b> {lead.status}</p>
            <button className="btn primary" onClick={() => openConversation(lead)}>Abrir conversa externa</button>
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
            {lead.history.map((history, index) => (
              <div className="timeline-item" key={index}>{history}</div>
            ))}
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
