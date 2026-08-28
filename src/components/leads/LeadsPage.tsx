import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS, LEAD_SOURCES } from '@/lib/crm/constants';
import { leadStatusBadgeStyle, tempBadgeStyle } from '@/lib/crm/badge-styles';
import type { Lead, LeadTemperature } from '@/types/crm';

type LeadForm={name:string;phone:string;email:string;city:string;source:string;owner:string;temperature:LeadTemperature};
type Props={
  leads:Lead[];leadForm:LeadForm;setLeadForm:(form:LeadForm)=>void;addLead:()=>void;
  filter:string;setFilter:(value:string)=>void;ownerFilter:string;setOwnerFilter:(value:string)=>void;
  sourceFilter:string;setSourceFilter:(value:string)=>void;tempFilter:string;setTempFilter:(value:string)=>void;
  setSelectedLead:(lead:Lead)=>void;openConversation:(lead:Lead)=>void;removeLead:(lead:Lead)=>void|Promise<void>;
};
const users=CRM_USERS.map(u=>u.name);

export function LeadsPage({leads,leadForm,setLeadForm,addLead,filter,setFilter,ownerFilter,setOwnerFilter,sourceFilter,setSourceFilter,tempFilter,setTempFilter,setSelectedLead,openConversation,removeLead}:Props){
  const [view,setView]=useState<'lista'|'cards'>('lista');
  const hot=leads.filter(l=>l.temperature==='Quente').length;
  const clients=leads.filter(l=>l.status==='Cliente').length;
  const cities=useMemo(()=>new Set(leads.map(l=>l.city).filter(Boolean)).size,[leads]);

  return <div className="workspace-stack">
    <section className="grid metrics compact-metrics">
      <div className="card metric"><span>Base filtrada</span><strong>{leads.length}</strong><small>contatos visíveis</small></div>
      <div className="card metric"><span>Quentes</span><strong>{hot}</strong><small>prioridade</small></div>
      <div className="card metric"><span>Clientes</span><strong>{clients}</strong><small>convertidos</small></div>
      <div className="card metric"><span>Cidades</span><strong>{cities}</strong><small>cobertura</small></div>
    </section>

    <details className="card pad create-panel">
      <summary>+ Novo contato / lead</summary>
      <div className="form-grid" style={{marginTop:16}}>
        <input className="input" placeholder="Nome" value={leadForm.name} onChange={e=>setLeadForm({...leadForm,name:e.target.value})}/>
        <input className="input" placeholder="WhatsApp" value={leadForm.phone} onChange={e=>setLeadForm({...leadForm,phone:e.target.value})}/>
        <input className="input" placeholder="E-mail" value={leadForm.email} onChange={e=>setLeadForm({...leadForm,email:e.target.value})}/>
        <input className="input" placeholder="Cidade" value={leadForm.city} onChange={e=>setLeadForm({...leadForm,city:e.target.value})}/>
        <select className="select" value={leadForm.source} onChange={e=>setLeadForm({...leadForm,source:e.target.value})}>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
        <select className="select" value={leadForm.owner} onChange={e=>setLeadForm({...leadForm,owner:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select>
        <select className="select" value={leadForm.temperature} onChange={e=>setLeadForm({...leadForm,temperature:e.target.value as LeadTemperature})}><option>Quente</option><option>Morno</option><option>Frio</option></select>
        <button className="btn primary" onClick={addLead}>Salvar e criar oportunidade</button>
      </div>
      <p className="notice">Ao salvar, o contato entra no banco real e já pode iniciar o pipeline comercial.</p>
    </details>

    <div className="toolbar">
      <div className="filters compact-filters">
        <input className="input" placeholder="Buscar nome ou telefone" value={filter} onChange={e=>setFilter(e.target.value)}/>
        <select className="select" value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}><option>Todos</option>{users.map(u=><option key={u}>{u}</option>)}</select>
        <select className="select" value={sourceFilter} onChange={e=>setSourceFilter(e.target.value)}><option>Todas</option>{LEAD_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
        <select className="select" value={tempFilter} onChange={e=>setTempFilter(e.target.value)}><option>Todas</option><option>Quente</option><option>Morno</option><option>Frio</option></select>
      </div>
      <div className="segmented"><button className={view==='lista'?'active':''} onClick={()=>setView('lista')}>Lista</button><button className={view==='cards'?'active':''} onClick={()=>setView('cards')}>Cards</button></div>
    </div>

    {view==='lista'?<section className="card pad">
      <div className="table-wrap"><table><thead><tr><th>Contato</th><th>Cidade</th><th>Origem</th><th>Responsável</th><th>Temperatura</th><th>Status</th><th>Ações</th></tr></thead><tbody>
        {leads.map(lead=><tr key={lead.id}><td><div className="client-line"><div className="avatar">{lead.name.slice(0,1).toUpperCase()}</div><div><b>{lead.name}</b><small>{lead.phone}</small></div></div></td><td>{lead.city||'—'}</td><td>{lead.source}</td><td>{lead.owner}</td><td><Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge></td><td><Badge style={leadStatusBadgeStyle(lead.status)}>{lead.status}</Badge></td><td><div className="deal-actions"><button className="btn small" onClick={()=>setSelectedLead(lead)}>Abrir</button><button className="btn small primary" onClick={()=>openConversation(lead)}>WhatsApp</button><button className="btn small danger" onClick={()=>removeLead(lead)}>Excluir</button></div></td></tr>)}
      </tbody></table></div>{!leads.length&&<div className="empty">Nenhum contato real para este filtro.</div>}
    </section>:<section className="lead-card-grid">{leads.map(lead=><article className="card lead-card" key={lead.id}><div className="catalog-head"><div><span className="one-kicker">{lead.source}</span><h2>{lead.name}</h2></div><Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge></div><p>{lead.phone} · {lead.city||'sem cidade'}</p><small>{lead.owner} · {lead.status}</small><div className="deal-actions"><button className="btn small" onClick={()=>setSelectedLead(lead)}>Ficha 360</button><button className="btn small primary" onClick={()=>openConversation(lead)}>WhatsApp</button></div></article>)}</section>}
  </div>;
}
