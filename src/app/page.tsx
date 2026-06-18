"use client";

import { useMemo, useState } from "react";
import { Login } from "@/components/auth/Login";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { AppShell } from "@/components/layout/AppShell";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { Badge } from "@/components/ui/Badge";
import { demoLeads, demoOpportunities, demoQuickMessages, demoTasks } from "@/data/demo-data";
import { CRM_USERS, LEAD_SOURCES, PIPELINE_STAGES } from "@/lib/crm/constants";
import { formatCurrencyBRL as brl } from "@/lib/crm/formatters";
import { leadStatusBadgeStyle, opportunityStatusBadgeStyle, taskStatusBadgeStyle, tempBadgeStyle } from "@/lib/crm/badge-styles";
import type { Lead, LeadTemperature, Opportunity, PipelineStage, QuickMessage, Screen, Task } from "@/types/crm";

type Temp = LeadTemperature;
type Stage = PipelineStage;
type Deal = Opportunity;

const stages = PIPELINE_STAGES;
const sources = LEAD_SOURCES;
const users = CRM_USERS.map((user) => user.name);

export default function Home() {
  const [logged, setLogged] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [deals, setDeals] = useState<Deal[]>(demoOpportunities);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [messages, setMessages] = useState<QuickMessage[]>(demoQuickMessages);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("Todos");
  const [sourceFilter, setSourceFilter] = useState("Todas");
  const [tempFilter, setTempFilter] = useState("Todas");
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", city: "", source: "Instagram", owner: "Lucas", temperature: "Quente" as Temp });
  const [taskForm, setTaskForm] = useState({ title: "", leadId: 1, owner: "Lucas", type: "Ligar", priority: "Média" as Task["priority"], due: "Hoje 18:00" });

  const filteredLeads = useMemo(() => leads.filter(l =>
    (l.name.toLowerCase().includes(filter.toLowerCase()) || l.phone.includes(filter)) &&
    (ownerFilter === "Todos" || l.owner === ownerFilter) &&
    (sourceFilter === "Todas" || l.source === sourceFilter) &&
    (tempFilter === "Todas" || l.temperature === tempFilter)
  ), [leads, filter, ownerFilter, sourceFilter, tempFilter]);

  function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert("Nome e WhatsApp são obrigatórios.");
    if (leads.some(l => l.phone === leadForm.phone)) return alert("Possível duplicidade: já existe um lead com esse WhatsApp.");
    const id = Date.now();
    const newLead: Lead = { id, ...leadForm, status: "Lead", lastInteraction: "agora", tags: ["Novo"], history: ["Lead criado manualmente"] };
    setLeads([newLead, ...leads]);
    setDeals([{ id: Date.now() + 1, leadId: id, title: "Nova oportunidade", value: 0, stage: "Novo Lead", owner: leadForm.owner, source: leadForm.source, temperature: leadForm.temperature, nextTask: "Primeiro contato", late: false, status: "Aberta", notes: "Criada junto ao novo lead." }, ...deals]);
    setLeadForm({ name: "", phone: "", email: "", city: "", source: "Instagram", owner: "Lucas", temperature: "Quente" });
  }

  function addHistory(leadId: number, text: string) {
    setLeads(ls => ls.map(l => l.id === leadId ? { ...l, lastInteraction: "agora", history: [text, ...l.history] } : l));
  }

  function moveDeal(id: number, stage: Stage) {
    setDeals(ds => ds.map(d => d.id === id ? { ...d, stage, status: stage === "Fechado" ? "Ganha" : stage === "Perdido" ? "Perdida" : "Aberta" } : d));
    const deal = deals.find(d => d.id === id);
    if (deal) addHistory(deal.leadId, `Oportunidade movida para ${stage}`);
  }

  function markWon(id: number) {
    const value = Number(prompt("Valor final da venda em R$:", "497"));
    if (!value) return alert("Venda ganha exige valor final.");
    setDeals(ds => ds.map(d => d.id === id ? { ...d, value, stage: "Fechado", status: "Ganha" } : d));
    const deal = deals.find(d => d.id === id);
    if (deal) addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);
  }

  function markLost(id: number) {
    const reason = prompt("Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?");
    if (!reason) return alert("Venda perdida exige motivo.");
    setDeals(ds => ds.map(d => d.id === id ? { ...d, stage: "Perdido", status: "Perdida", notes: `${d.notes} Motivo da perda: ${reason}.` } : d));
    const deal = deals.find(d => d.id === id);
    if (deal) addHistory(deal.leadId, `Venda perdida. Motivo: ${reason}`);
  }

  function openConversation(lead: Lead) {
    addHistory(lead.id, "Conversa externa aberta pelo CRM");
    window.open(`https://wa.me/${lead.phone}`, "_blank");
  }

  function copyMessage(msg: QuickMessage, lead?: Lead) {
    navigator.clipboard?.writeText(msg.text);
    if (lead) addHistory(lead.id, `Mensagem rápida copiada: ${msg.title}`);
    alert("Mensagem copiada.");
  }

  function addTask() {
    if (!taskForm.title.trim()) return alert("A tarefa precisa de título.");
    setTasks([{ id: Date.now(), ...taskForm, status: "Pendente" }, ...tasks]);
    addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
    setTaskForm({ title: "", leadId: 1, owner: "Lucas", type: "Ligar", priority: "Média", due: "Hoje 18:00" });
  }

  if (!logged) return <Login onLogin={() => setLogged(true)} />;

  return (
    <AppShell screen={screen} setScreen={setScreen}>
      <Header screen={screen} setScreen={setScreen} />
      {screen === "dashboard" && <DashboardPage leads={leads} deals={deals} tasks={tasks} setScreen={setScreen} />}
      {screen === "leads" && <LeadsPage leads={filteredLeads} leadForm={leadForm} setLeadForm={setLeadForm} addLead={addLead} filter={filter} setFilter={setFilter} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} tempFilter={tempFilter} setTempFilter={setTempFilter} setSelectedLead={setSelectedLead} openConversation={openConversation} />}
      {screen === "kanban" && <Kanban leads={leads} deals={deals} moveDeal={moveDeal} markWon={markWon} markLost={markLost} openConversation={openConversation} setSelectedLead={setSelectedLead} />}
      {screen === "tasks" && <Tasks tasks={tasks} setTasks={setTasks} leads={leads} taskForm={taskForm} setTaskForm={setTaskForm} addTask={addTask} />}
      {screen === "messages" && <Messages messages={messages} setMessages={setMessages} copyMessage={copyMessage} />}
      {screen === "reports" && <Reports leads={leads} deals={deals} tasks={tasks} />}
      {screen === "settings" && <Settings />}
      {selectedLead && <ClientDrawer lead={selectedLead} deals={deals.filter(d => d.leadId === selectedLead.id)} tasks={tasks.filter(t => t.leadId === selectedLead.id)} messages={messages} onClose={() => setSelectedLead(null)} openConversation={openConversation} copyMessage={copyMessage} />}
    </AppShell>
  );
}

function Header({ screen, setScreen }: { screen: Screen, setScreen: (s: Screen) => void }) {
  const titles: Record<Screen, string> = { dashboard: "Dashboard comercial", leads: "Contatos e leads", kanban: "Kanban comercial", tasks: "Tarefas e follow-ups", messages: "Mensagens rápidas", reports: "Relatórios", settings: "Configurações" };
  return <div className="topbar"><div><h1>{titles[screen]}</h1><p>Clack Growth Company • MVP 1 operacional</p></div><div className="top-actions"><button className="btn" onClick={() => setScreen("leads")}>Novo Lead</button><button className="btn primary" onClick={() => setScreen("kanban")}>Abrir Funil</button></div></div>;
}

function Kanban({ leads, deals, moveDeal, markWon, markLost, openConversation, setSelectedLead }: { leads: Lead[]; deals: Deal[]; moveDeal: (id:number,s:Stage)=>void; markWon:(id:number)=>void; markLost:(id:number)=>void; openConversation:(l:Lead)=>void; setSelectedLead:any }) {
  const leadById = (id:number) => leads.find(l=>l.id===id)!;
  return <div className="kanban">{stages.map(stage => <div className="column" key={stage}><div className="column-head"><span>{stage}</span><b>{deals.filter(d=>d.stage===stage).length}</b></div>{deals.filter(d=>d.stage===stage).map(d => { const lead = leadById(d.leadId); return <div className="deal-card" key={d.id}><strong>{lead.name}</strong><div className="deal-meta"><span>{d.title}</span><b>{brl(d.value)}</b></div><div><Badge style={tempBadgeStyle(d.temperature)}>{d.temperature}</Badge> {d.late && <Badge style={taskStatusBadgeStyle("Vencida")}>Atrasado</Badge>}</div><div className="deal-meta"><span>{d.owner}</span><span>{d.source}</span></div><small className="notice">Próxima ação: {d.nextTask}</small><select className="select" value={d.stage} onChange={e=>moveDeal(d.id, e.target.value as Stage)}>{stages.map(s=><option key={s}>{s}</option>)}</select><div className="deal-actions"><button className="btn small" onClick={()=>setSelectedLead(lead)}>Abrir</button><button className="btn small" onClick={()=>openConversation(lead)}>Conversa</button><button className="btn small success" onClick={()=>markWon(d.id)}>Ganha</button><button className="btn small danger" onClick={()=>markLost(d.id)}>Perdida</button></div></div> })}</div>)}</div>;
}

function Tasks({ tasks, setTasks, leads, taskForm, setTaskForm, addTask }: { tasks: Task[]; setTasks: any; leads: Lead[]; taskForm: any; setTaskForm: any; addTask:()=>void }) {
  return <div className="grid two-col"><div className="card pad"><div className="section-title"><h2>Lista de tarefas</h2><span>Follow-ups e pendências</span></div>{tasks.map(t=><div className="timeline-item" key={t.id}><b>{t.title}</b><br/><span className="notice">{t.owner} • {t.type} • {t.priority} • {t.due}</span><div style={{marginTop:10}}><Badge style={taskStatusBadgeStyle(t.status)}>{t.status}</Badge> <button className="btn small" onClick={()=>setTasks(tasks.map((x:Task)=>x.id===t.id?{...x,status:"Concluída"}:x))}>Concluir</button></div></div>)}</div><div className="card pad"><div className="section-title"><h2>Nova tarefa</h2></div><div className="form-grid"><input className="input full" placeholder="Título" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/><select className="select" value={taskForm.leadId} onChange={e=>setTaskForm({...taskForm,leadId:Number(e.target.value)})}>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select><select className="select" value={taskForm.owner} onChange={e=>setTaskForm({...taskForm,owner:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select><select className="select" value={taskForm.type} onChange={e=>setTaskForm({...taskForm,type:e.target.value})}>{["Ligar","Enviar mensagem","Reunião","Enviar proposta","Cobrar retorno","Pós-venda","Outro"].map(x=><option key={x}>{x}</option>)}</select><select className="select" value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as Task["priority"]})}><option>Baixa</option><option>Média</option><option>Alta</option></select><input className="input full" value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}/><button className="btn primary full" onClick={addTask}>Criar tarefa</button></div></div></div>;
}

function Messages({ messages, setMessages, copyMessage }: { messages: QuickMessage[]; setMessages: any; copyMessage: (m: QuickMessage)=>void }) {
  const [form, setForm] = useState({ title:"", category:"Boas-vindas", text:"" });
  function add(){ if(!form.title || !form.text) return alert("Preencha título e texto."); setMessages([{id:Date.now(),...form,active:true},...messages]); setForm({ title:"", category:"Boas-vindas", text:"" }); }
  return <div className="grid two-col"><div className="card pad"><div className="section-title"><h2>Biblioteca de mensagens</h2><span>{messages.length} modelos</span></div><div className="grid">{messages.map(m=><div className="message-card" key={m.id}><div className="section-title"><h2>{m.title}</h2><span>{m.category}</span></div><p>{m.text}</p><div><Badge style={leadStatusBadgeStyle(m.active ? "Cliente" : "Inativo")}>{m.active?"Ativa":"Inativa"}</Badge> <button className="btn small" onClick={()=>copyMessage(m)}>Copiar</button> <button className="btn small" onClick={()=>setMessages(messages.map((x:QuickMessage)=>x.id===m.id?{...x,active:!x.active}:x))}>{m.active?"Inativar":"Ativar"}</button></div></div>)}</div></div><div className="card pad"><h2>Nova mensagem rápida</h2><div className="form-grid"><input className="input full" placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><select className="select full" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{["Boas-vindas","Primeiro contato","Retorno","Fechamento","Pós-venda"].map(c=><option key={c}>{c}</option>)}</select><textarea className="textarea full" placeholder="Texto da mensagem" value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/><button className="btn primary full" onClick={add}>Salvar modelo</button></div></div></div>;
}

function Reports({ leads, deals, tasks }: { leads: Lead[]; deals: Deal[]; tasks: Task[] }) {
  const sourceCounts = sources.map(s => ({ name:s, count: leads.filter(l=>l.source===s).length }));
  const sellerSales = users.map(u => ({ name:u, value: deals.filter(d=>d.owner===u && d.status==="Ganha").reduce((a,d)=>a+d.value,0) }));
  return <div className="grid two-col"><div className="card pad"><div className="section-title"><h2>Leads por origem</h2><span>Captação</span></div><div className="report-bars">{sourceCounts.map(x=><div className="bar" key={x.name}><span><b>{x.name}</b><b>{x.count}</b></span><i style={{width:`${Math.max(8,x.count*18)}%`}} /></div>)}</div></div><div className="card pad"><h2>Resumo comercial</h2><p>Vendas ganhas: <b>{deals.filter(d=>d.status==="Ganha").length}</b></p><p>Vendas perdidas: <b>{deals.filter(d=>d.status==="Perdida").length}</b></p><p>Valor vendido: <b>{brl(deals.filter(d=>d.status==="Ganha").reduce((a,d)=>a+d.value,0))}</b></p><p>Tarefas vencidas: <b>{tasks.filter(t=>t.status==="Vencida").length}</b></p></div><div className="card pad"><div className="section-title"><h2>Ranking de vendedores</h2></div><div className="report-bars">{sellerSales.map(x=><div className="bar" key={x.name}><span><b>{x.name}</b><b>{brl(x.value)}</b></span><i style={{width:`${Math.max(10,x.value/20)}%`}} /></div>)}</div></div></div>;
}

function Settings() {
  return <div className="grid two-col"><div className="card pad"><h2>Empresa</h2><div className="form-grid"><input className="input" defaultValue="Clack Growth Company"/><input className="input" defaultValue="will@clackcrm.com.br"/><input className="input" defaultValue="Nordeste, Sul e Centro-Oeste"/><input className="input" defaultValue="Growth, Marketing, Comercial e RH"/></div></div><div className="card pad"><h2>Perfis e permissões</h2>{["Admin Empresa — acesso total","Gestor — equipe, relatórios e funil","Vendedor — próprios leads e oportunidades","Atendente — cadastro e atendimento","Financeiro — vendas fechadas e valores"].map(x=><div className="timeline-item" key={x}>{x}</div>)}</div><div className="card pad"><h2>Módulos em breve</h2><p className="notice">Automação, InfinitePay, API oficial de mensageria, webhooks, white label e IA.</p></div></div>;
}

function ClientDrawer({ lead, deals, tasks, messages, onClose, openConversation, copyMessage }: { lead: Lead; deals: Deal[]; tasks: Task[]; messages: QuickMessage[]; onClose:()=>void; openConversation:(l:Lead)=>void; copyMessage:(m:QuickMessage,l:Lead)=>void }) {
  const [tab, setTab] = useState("Resumo");
  return <div className="drawer"><div className="drawer-panel"><div className="section-title"><div><h1>{lead.name}</h1><p className="notice">{lead.city} • {lead.source} • {lead.owner}</p></div><button className="btn" onClick={onClose}>Fechar</button></div><div><Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge> <Badge style={leadStatusBadgeStyle(lead.status)}>{lead.status}</Badge> {lead.tags.map(t=><Badge key={t}>{t}</Badge>)}</div><div className="tabs">{["Resumo","Oportunidades","Histórico","Tarefas","Conversa"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==="Resumo" && <div className="card pad"><p><b>WhatsApp:</b> {lead.phone}</p><p><b>E-mail:</b> {lead.email}</p><p><b>Status:</b> {lead.status}</p><button className="btn primary" onClick={()=>openConversation(lead)}>Abrir conversa externa</button></div>}{tab==="Oportunidades" && <div className="grid">{deals.map(d=><div className="timeline-item" key={d.id}><b>{d.title}</b><br/>{brl(d.value)} • {d.stage} • <Badge style={opportunityStatusBadgeStyle(d.status)}>{d.status}</Badge></div>)}</div>}{tab==="Histórico" && <div className="timeline">{lead.history.map((h,i)=><div className="timeline-item" key={i}>{h}</div>)}</div>}{tab==="Tarefas" && <div className="timeline">{tasks.length?tasks.map(t=><div className="timeline-item" key={t.id}><b>{t.title}</b><br/>{t.due} • <Badge style={taskStatusBadgeStyle(t.status)}>{t.status}</Badge></div>):<div className="empty">Nenhuma tarefa vinculada.</div>}</div>}{tab==="Conversa" && <div className="grid"><button className="btn primary" onClick={()=>openConversation(lead)}>Abrir conversa externa</button>{messages.filter(m=>m.active).map(m=><div className="message-card" key={m.id}><b>{m.title}</b><p>{m.text}</p><button className="btn small" onClick={()=>copyMessage(m,lead)}>Copiar mensagem</button></div>)}</div>}</div></div>;
}
