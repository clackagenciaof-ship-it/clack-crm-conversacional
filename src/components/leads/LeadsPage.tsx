import { Badge } from '@/components/ui/Badge';
import { CRM_USERS, LEAD_SOURCES } from '@/lib/crm/constants';
import { leadStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import type { Lead, LeadTemperature } from '@/types/crm';

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
};

type LeadsPageProps = {
  leads: Lead[];
  leadForm: LeadForm;
  setLeadForm: (form: LeadForm) => void;
  addLead: () => void;
  filter: string;
  setFilter: (filter: string) => void;
  ownerFilter: string;
  setOwnerFilter: (filter: string) => void;
  sourceFilter: string;
  setSourceFilter: (filter: string) => void;
  tempFilter: string;
  setTempFilter: (filter: string) => void;
  setSelectedLead: (lead: Lead) => void;
  openConversation: (lead: Lead) => void;
};

const users = CRM_USERS.map((user) => user.name);

export function LeadsPage(props: LeadsPageProps) {
  const p = props;

  return (
    <div className="grid">
      <div className="card pad">
        <div className="section-title">
          <h2>Novo lead</h2>
          <span>Nome e WhatsApp são obrigatórios</span>
        </div>
        <div className="form-grid">
          <input className="input" placeholder="Nome" value={p.leadForm.name} onChange={(event) => p.setLeadForm({ ...p.leadForm, name: event.target.value })} />
          <input className="input" placeholder="WhatsApp com DDI" value={p.leadForm.phone} onChange={(event) => p.setLeadForm({ ...p.leadForm, phone: event.target.value })} />
          <input className="input" placeholder="E-mail" value={p.leadForm.email} onChange={(event) => p.setLeadForm({ ...p.leadForm, email: event.target.value })} />
          <input className="input" placeholder="Cidade" value={p.leadForm.city} onChange={(event) => p.setLeadForm({ ...p.leadForm, city: event.target.value })} />
          <select className="select" value={p.leadForm.source} onChange={(event) => p.setLeadForm({ ...p.leadForm, source: event.target.value })}>
            {LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
          <select className="select" value={p.leadForm.owner} onChange={(event) => p.setLeadForm({ ...p.leadForm, owner: event.target.value })}>
            {users.map((user) => <option key={user}>{user}</option>)}
          </select>
          <select className="select" value={p.leadForm.temperature} onChange={(event) => p.setLeadForm({ ...p.leadForm, temperature: event.target.value as LeadTemperature })}>
            <option>Quente</option>
            <option>Morno</option>
            <option>Frio</option>
          </select>
          <button className="btn primary" onClick={p.addLead}>Cadastrar lead</button>
        </div>
      </div>

      <div className="card pad">
        <div className="filters">
          <input className="input" placeholder="Buscar por nome ou telefone" value={p.filter} onChange={(event) => p.setFilter(event.target.value)} />
          <select className="select" value={p.ownerFilter} onChange={(event) => p.setOwnerFilter(event.target.value)}>
            <option>Todos</option>
            {users.map((user) => <option key={user}>{user}</option>)}
          </select>
          <select className="select" value={p.sourceFilter} onChange={(event) => p.setSourceFilter(event.target.value)}>
            <option>Todas</option>
            {LEAD_SOURCES.map((source) => <option key={source}>{source}</option>)}
          </select>
          <select className="select" value={p.tempFilter} onChange={(event) => p.setTempFilter(event.target.value)}>
            <option>Todas</option>
            <option>Quente</option>
            <option>Morno</option>
            <option>Frio</option>
          </select>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Lead</th>
                <th>WhatsApp</th>
                <th>Cidade</th>
                <th>Origem</th>
                <th>Responsável</th>
                <th>Temp.</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {p.leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <div className="client-line">
                      <div className="avatar">{lead.name[0]}</div>
                      <div>
                        <b>{lead.name}</b>
                        <br />
                        <span className="notice">{lead.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>{lead.phone}</td>
                  <td>{lead.city}</td>
                  <td>{lead.source}</td>
                  <td>{lead.owner}</td>
                  <td><Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge></td>
                  <td><Badge style={leadStatusBadgeStyle(lead.status)}>{lead.status}</Badge></td>
                  <td>
                    <button className="btn small" onClick={() => p.setSelectedLead(lead)}>Ficha</button>{' '}
                    <button className="btn small primary" onClick={() => p.openConversation(lead)}>Conversa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
