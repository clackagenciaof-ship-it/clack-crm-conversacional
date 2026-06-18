"use client";

import { useMemo, useState, type CSSProperties } from "react";

type Screen = "dashboard" | "leads" | "kanban" | "tasks" | "messages" | "reports" | "settings";
type Temp = "Quente" | "Morno" | "Frio";
type Stage = "Novo Lead" | "Primeiro Contato" | "Qualificação" | "Apresentação Enviada" | "Proposta Enviada" | "Negociação" | "Fechado" | "Perdido";

type Lead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: Temp;
  status: "Lead" | "Cliente" | "Inativo" | "Arquivado";
  lastInteraction: string;
  tags: string[];
  history: string[];
};

type Deal = {
  id: number;
  leadId: number;
  title: string;
  value: number;
  stage: Stage;
  owner: string;
  source: string;
  temperature: Temp;
  nextTask: string;
  late: boolean;
  status: "Aberta" | "Ganha" | "Perdida" | "Arquivada";
  notes: string;
};

type Task = {
  id: number;
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: "Baixa" | "Média" | "Alta";
  due: string;
  status: "Pendente" | "Em andamento" | "Concluída" | "Vencida" | "Cancelada";
};

type QuickMessage = { id: number; title: string; category: string; active: boolean; text: string };

const stages: Stage[] = ["Novo Lead", "Primeiro Contato", "Qualificação", "Apresentação Enviada", "Proposta Enviada", "Negociação", "Fechado", "Perdido"];
const sources = ["Instagram", "WhatsApp", "Indicação", "Tráfego Pago", "Site", "Campanha Comercial", "Blitz"];
const users = ["Will Sampaio", "Amanda", "Lucas", "Daniela"];

const initialLeads: Lead[] = [
  { id: 1, name: "Lucas Pereira", phone: "5598999990001", email: "lucas@email.com", city: "Floriano", source: "Instagram", owner: "Lucas", temperature: "Quente", status: "Lead", lastInteraction: "há 8 min", tags: ["Prioridade"], history: ["Lead criado via Instagram", "WhatsApp acionado por Lucas"] },
  { id: 2, name: "Ana Clara", phone: "5598999990002", email: "ana@email.com", city: "Teresina", source: "WhatsApp", owner: "Daniela", temperature: "Quente", status: "Lead", lastInteraction: "há 18 min", tags: ["Campanha"], history: ["Atendimento iniciado", "Mensagem rápida de boas-vindas copiada"] },
  { id: 3, name: "Isabela Costa", phone: "5598999990003", email: "isabela@email.com", city: "Parnaíba", source: "Indicação", owner: "Amanda", temperature: "Morno", status: "Cliente", lastInteraction: "hoje", tags: ["Cliente final"], history: ["Oportunidade criada", "Reunião agendada"] },
  { id: 4, name: "Marcos Oliveira", phone: "5598999990004", email: "marcos@email.com", city: "Picos", source: "Tráfego Pago", owner: "Lucas", temperature: "Frio", status: "Lead", lastInteraction: "ontem", tags: ["Retorno"], history: ["Lead qualificado", "Aguardando orçamento"] },
  { id: 5, name: "Fernanda Lima", phone: "5598999990005", email: "fernanda@email.com", city: "Uruçuí", source: "Site", owner: "Daniela", temperature: "Morno", status: "Lead", lastInteraction: "há 2h", tags: ["Site"], history: ["Contato enviado pelo site"] },
  { id: 6, name: "Rafael Santos", phone: "5598999990006", email: "rafael@email.com", city: "Timon", source: "Blitz", owner: "Amanda", temperature: "Quente", status: "Cliente", lastInteraction: "há 3h", tags: ["Fechamento"], history: ["Proposta enviada", "Negociação em andamento"] },
  { id: 7, name: "Thiago Almeida", phone: "5598999990007", email: "thiago@email.com", city: "Barão", source: "Campanha Comercial", owner: "Lucas", temperature: "Quente", status: "Lead", lastInteraction: "há 4h", tags: ["Campanha"], history: ["Entrou pela campanha comercial"] },
  { id: 8, name: "Evelyn Silva", phone: "5598999990008", email: "evelyn@email.com", city: "Oeiras", source: "Instagram", owner: "Daniela", temperature: "Frio", status: "Lead", lastInteraction: "há 1 dia", tags: ["Frio"], history: ["Mensagem enviada", "Sem resposta"] },
  { id: 9, name: "Sérgio Roberto", phone: "5598999990009", email: "sergio@email.com", city: "Floriano", source: "Indicação", owner: "Amanda", temperature: "Morno", status: "Lead", lastInteraction: "há 2 dias", tags: ["Indicação"], history: ["Contato indicado por cliente"] },
  { id: 10, name: "Márcio Costa", phone: "5598999990010", email: "marcio@email.com", city: "Teresina", source: "WhatsApp", owner: "Lucas", temperature: "Quente", status: "Lead", lastInteraction: "agora", tags: ["Prioridade"], history: ["Solicitou proposta pelo WhatsApp"] }
];

const initialDeals: Deal[] = [
  { id: 1, leadId: 1, title: "Plano CRM Start", value: 297, stage: "Novo Lead", owner: "Lucas", source: "Instagram", temperature: "Quente", nextTask: "Chamar hoje", late: false, status: "Aberta", notes: "Interesse em organizar vendas pelo WhatsApp." },
  { id: 2, leadId: 2, title: "Implantação Comercial", value: 1500, stage: "Primeiro Contato", owner: "Daniela", source: "WhatsApp", temperature: "Quente", nextTask: "Qualificar demanda", late: false, status: "Aberta", notes: "Precisa de funil para equipe de atendimento." },
  { id: 3, leadId: 3, title: "CRM Pro", value: 497, stage: "Qualificação", owner: "Amanda", source: "Indicação", temperature: "Morno", nextTask: "Reunião 15h", late: false, status: "Aberta", notes: "Cliente pediu demonstração." },
  { id: 4, leadId: 4, title: "Treinamento + CRM", value: 2500, stage: "Apresentação Enviada", owner: "Lucas", source: "Tráfego Pago", temperature: "Frio", nextTask: "Cobrar retorno", late: true, status: "Aberta", notes: "Aguardando decisão do gestor." },
  { id: 5, leadId: 6, title: "CRM Premium", value: 997, stage: "Proposta Enviada", owner: "Amanda", source: "Blitz", temperature: "Quente", nextTask: "Negociar condição", late: false, status: "Aberta", notes: "Alta chance de fechamento." },
  { id: 6, leadId: 7, title: "Campanha + CRM", value: 3200, stage: "Negociação", owner: "Lucas", source: "Campanha Comercial", temperature: "Quente", nextTask: "Enviar contrato", late: false, status: "Aberta", notes: "Quer começar ainda esta semana." },
  { id: 7, leadId: 10, title: "Assinatura Mensal", value: 397, stage: "Fechado", owner: "Lucas", source: "WhatsApp", temperature: "Quente", nextTask: "Onboarding", late: false, status: "Ganha", notes: "Fechado em Pix manual." },
  { id: 8, leadId: 8, title: "CRM Start", value: 297, stage: "Perdido", owner: "Daniela", source: "Instagram", temperature: "Frio", nextTask: "Reativar em 30 dias", late: false, status: "Perdida", notes: "Sem orçamento no momento." }
];

const initialTasks: Task[] = [
  { id: 1, title: "Ligar para Lucas Pereira", leadId: 1, owner: "Lucas", type: "Ligar", priority: "Alta", due: "Hoje 10:00", status: "Pendente" },
  { id: 2, title: "Cobrar retorno de Marcos", leadId: 4, owner: "Lucas", type: "Cobrar retorno", priority: "Alta", due: "Ontem 17:00", status: "Vencida" },
  { id: 3, title: "Reunião com Isabela", leadId: 3, owner: "Amanda", type: "Reunião", priority: "Média", due: "Hoje 15:00", status: "Em andamento" },
  { id: 4, title: "Enviar proposta para Rafael", leadId: 6, owner: "Amanda", type: "Enviar proposta", priority: "Alta", due: "Amanhã 09:00", status: "Pendente" }
];

const initialMessages: QuickMessage[] = [
  { id: 1, title: "Boas-vindas", category: "Boas-vindas", active: true, text: "Olá, tudo bem? Aqui é da equipe comercial. Recebemos seu contato e vou te ajudar agora." },
  { id: 2, title: "Qualificação", category: "Primeiro contato", active: true, text: "Vi que você demonstrou interesse. Posso te fazer algumas perguntas rápidas para entender melhor sua necessidade?" },
  { id: 3, title: "Retorno de proposta", category: "Retorno", active: true, text: "Passando para saber se conseguiu analisar nossa proposta. Posso te ajudar com alguma dúvida?" },
  { id: 4, title: "Fechamento", category: "Fechamento", active: true, text: "Temos uma condição especial disponível hoje. Posso seguir com seu cadastro?" }
];

const brl = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function tempBadgeStyle(temp: Temp): CSSProperties {
  const styles: Record<Temp, CSSProperties> = {
    Quente: { background: "#ffe1d6", color: "#a33a12", borderColor: "#ffb49b" },
    Morno: { background: "#fff2c7", color: "#7a5a00", borderColor: "#f3d36a" },
    Frio: { background: "#dff8ff", color: "#07657a", borderColor: "#9edff0" }
  };
  return styles[temp];
}

function leadStatusBadgeStyle(status: Lead["status"]): CSSProperties {
  const styles: Record<Lead["status"], CSSProperties> = {
    Lead: { background: "#e6f1ff", color: "#22528a", borderColor: "#b9d6f6" },
    Cliente: { background: "#dcf8e9", color: "#0b6b42", borderColor: "#93dfb7" },
    Inativo: { background: "#edf1f1", color: "#5d6d6a", borderColor: "#d0dbd9" },
    Arquivado: { background: "#ebe7f8", color: "#55417a", borderColor: "#d6cdf0" }
  };
  return styles[status];
}

function taskStatusBadgeStyle(status: Task["status"]): CSSProperties {
  const styles: Record<Task["status"], CSSProperties> = {
    Pendente: { background: "#fff4cc", color: "#7a5a00", borderColor: "#f1d46e" },
    "Em andamento": { background: "#e1f0ff", color: "#0c5e99", borderColor: "#afd5f6" },
    Concluída: { background: "#dcf8e9", color: "#0b6b42", borderColor: "#93dfb7" },
    Vencida: { background: "#ffe0e0", color: "#9a2727", borderColor: "#f5aaaa" },
    Cancelada: { background: "#edf1f1", color: "#5d6d6a", borderColor: "#d0dbd9" }
  };
  return styles[status];
}

function dealStatusBadgeStyle(status: Deal["status"]): CSSProperties {
  const styles: Record<Deal["status"], CSSProperties> = {
    Aberta: { background: "#e6f1ff", color: "#22528a", borderColor: "#b9d6f6" },
    Ganha: { background: "#dcf8e9", color: "#0b6b42", borderColor: "#93dfb7" },
    Perdida: { background: "#ffe0e0", color: "#9a2727", borderColor: "#f5aaaa" },
    Arquivada: { background: "#edf1f1", color: "#5d6d6a", borderColor: "#d0dbd9" }
  };
  return styles[status];
}

function Badge({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <span className="badge" style={style}>{children}</span>;
}

export default function Home() {
  const [logged, setLogged] = useState(false);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [deals, setDeals] = useState<Deal[]>(initialDeals);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [messages, setMessages] = useState<QuickMessage[]>(initialMessages);
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

  const nav = [
    ["dashboard", "Dashboard"], ["leads", "Leads"], ["kanban", "Kanban"], ["tasks", "Tarefas"], ["messages", "Mensagens"], ["reports", "Relatórios"], ["settings", "Configurações"]
  ] as const;

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
    const deal = deals.find(d => d.id === id); if (deal) addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);
  }

  function markLost(id: number) {
    const reason = prompt("Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?");
    if (!reason) return alert("Venda perdida exige motivo.");
    setDeals(ds => ds.map(d => d.id === id ? { ...d, stage: "Perdido", status: "Perdida", notes: `${d.notes} Motivo da perda: ${reason}.` } : d));
    const deal = deals.find(d => d.id === id); if (deal) addHistory(deal.leadId, `Venda perdida. Motivo: ${reason}`);
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
    <div className="app">
      <aside className="sidebar">
        <div className="brand"><div className="logo-mark">C</div><div><strong>CLACK CRM</strong><span>Conversacional</span></div></div>
        <div className="nav">{nav.map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => setScreen(key)}>{label}</button>)}</div>
        <div className="sidebar-card"><strong>Próximas fases</strong><p>Automação, pagamentos InfinitePay, API oficial de mensageria, webhooks, white label e IA aparecem como módulos em breve.</p></div>
      </aside>
      <main className="main">
        <Header screen={screen} setScreen={setScreen} />
        {screen === "dashboard" && <Dashboard leads={leads} deals={deals} tasks={tasks} setScreen={setScreen} />}
        {screen === "leads" && <Leads leads={filteredLeads} leadForm={leadForm} setLeadForm={setLeadForm} addLead={addLead} filter={filter} setFilter={setFilter} ownerFilter={ownerFilter} setOwnerFilter={setOwnerFilter} sourceFilter={sourceFilter} setSourceFilter={setSourceFilter} tempFilter={tempFilter} setTempFilter={setTempFilter} setSelectedLead={setSelectedLead} openConversation={openConversation} />}
        {screen === "kanban" && <Kanban leads={leads} deals={deals} moveDeal={moveDeal} markWon={markWon} markLost={markLost} openConversation={openConversation} setSelectedLead={setSelectedLead} />}
        {screen === "tasks" && <Tasks tasks={tasks} setTasks={setTasks} leads={leads} taskForm={taskForm} setTaskForm={setTaskForm} addTask={addTask} />}
        {screen === "messages" && <Messages messages={messages} setMessages={setMessages} copyMessage={copyMessage} />}
        {screen === "reports" && <Reports leads={leads} deals={deals} tasks={tasks} />}
        {screen === "settings" && <Settings />}
      </main>
      <div className="mobile-nav">{nav.slice(0, 5).map(([key, label]) => <button key={key} className={screen === key ? "active" : ""} onClick={() => setScreen(key)}>{label}</button>)}</div>
      {selectedLead && <ClientDrawer lead={selectedLead} deals={deals.filter(d => d.leadId === selectedLead.id)} tasks={tasks.filter(t => t.leadId === selectedLead.id)} messages={messages} onClose={() => setSelectedLead(null)} openConversation={openConversation} copyMessage={copyMessage} />}
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  return <section className="login"><div className="login-card"><div className="login-brand"><div className="logo-mark">C</div><h1>CLACK <span className="gradient-text">CRM</span></h1><p>Venda mais, atenda melhor e acompanhe seu funil em tempo real.</p><div className="login-kpis"><div><strong>24/7</strong><span>operação organizada</span></div><div><strong>8</strong><span>etapas comerciais</span></div><div><strong>360º</strong><span>visão do cliente</span></div></div></div><form className="login-form" onSubmit={(e) => { e.preventDefault(); onLogin(); }}><h2>Entrar no CRM</h2><p className="notice">Modo MVP: use qualquer e-mail e senha para acessar a demonstração funcional.</p><label>E-mail<input className="input" type="email" placeholder="will@clackcrm.com.br" /></label><label>Senha<input className="input" type="password" placeholder="••••••••" /></label><button className="btn primary">Entrar</button><button type="button" className="btn ghost">Esqueci minha senha</button></form></div></section>;
}

function Header({ screen, setScreen }: { screen: Screen, setScreen: (s: Screen) => void }) {
  const titles: Record<Screen, string> = { dashboard: "Dashboard comercial", leads: "Contatos e leads", kanban: "Kanban comercial", tasks: "Tarefas e follow-ups", messages: "Mensagens rápidas", reports: "Relatórios", settings: "Configurações" };
  return <div className="topbar"><div><h1>{titles[screen]}</h1><p>Clack Growth Company • MVP 1 operacional</p></div><div className="top-actions"><button className="btn" onClick={() => setScreen("leads")}>Novo Lead</button><button className="btn primary" onClick={() => setScreen("kanban")}>Abrir Funil</button></div></div>;
}

function Dashboard({ leads, deals, tasks, setScreen }: { leads: Lead[]; deals: Deal[]; tasks: Task[]; setScreen: (s: Screen) => void }) {
  const won = deals.filter(d => d.status === "Ganha");
  const open = deals.filter(d => d.status === "Aberta");
  const conversion = deals.length ? Math.round(won.length / deals.length * 100) : 0;
  const metrics = [["Leads novos", leads.length], ["Oportunidades abertas", open.length], ["Vendas fechadas", won.length], ["Valor em negociação", brl(open.reduce((a,d)=>a+d.value,0))], ["Taxa de conversão", `${conversion}%`], ["Tarefas vencidas", tasks.filter(t=>t.status==="Vencida").length]];
  const weeklyLine = [2, 3, 5, 4, 7, 8, leads.length];
  const maxLine = Math.max(...weeklyLine);
  const linePoints = weeklyLine.map((value, index) => `${34 + index * 47},${122 - (value / maxLine) * 82}`).join(" ");
  const sourceCounts = sources.map(source => ({ name: source, count: leads.filter(l => l.source === source).length }));
  const maxSource = Math.max(...sourceCounts.map(s => s.count), 1);
  const tempCounts = ["Quente", "Morno", "Frio"].map(temp => ({ name: temp as Temp, count: leads.filter(l => l.temperature === temp).length }));
  const totalTemps = Math.max(tempCounts.reduce((sum, item) => sum + item.count, 0), 1);
  let current = 0;
  const pieColors: Record<Temp, string> = { Quente: "#e86b42", Morno: "#d5a51c", Frio: "#36a7bd" };
  const pieGradient = tempCounts.map(item => { const start = current; const end = current + (item.count / totalTemps) * 100; current = end; return `${pieColors[item.name]} ${start}% ${end}%`; }).join(", ");

  return <>
    <div className="grid metrics">{metrics.map(([label, value]) => <div className="card metric" key={label}><span>{label}</span><strong>{value}</strong><small>Atualizado agora</small></div>)}</div>
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginTop: 16 }}>
      <div className="card pad">
        <div className="section-title"><h2>Gráfico de linhas</h2><span>Evolução de leads</span></div>
        <svg viewBox="0 0 330 150" width="100%" height="160" role="img" aria-label="Evolução semanal de leads">
          <path d="M34 124 H318" stroke="#c9dfdd" strokeWidth="2" />
          <path d="M34 84 H318" stroke="#d9ebe9" strokeWidth="1" />
          <path d="M34 44 H318" stroke="#d9ebe9" strokeWidth="1" />
          <polyline points={linePoints} fill="none" stroke="#005954" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          {weeklyLine.map((value, index) => <circle key={index} cx={34 + index * 47} cy={122 - (value / maxLine) * 82} r="5" fill="#5dc1b9" stroke="#005954" strokeWidth="2" />)}
        </svg>
      </div>
      <div className="card pad">
        <div className="section-title"><h2>Gráfico de barras</h2><span>Leads por origem</span></div>
        <div className="report-bars">{sourceCounts.map(item => <div className="bar" key={item.name}><span><b>{item.name}</b><b>{item.count}</b></span><i style={{ width: `${Math.max(7, (item.count / maxSource) * 100)}%` }} /></div>)}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><h2>Gráfico de pizza</h2><span>Temperatura</span></div>
        <div style={{ display: "grid", placeItems: "center", gap: 12 }}>
          <div style={{ width: 142, height: 142, borderRadius: "50%", background: `conic-gradient(${pieGradient})`, boxShadow: "0 18px 40px rgba(0,89,84,.14)" }} />
          <div style={{ display: "grid", gap: 8, width: "100%" }}>{tempCounts.map(item => <span key={item.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><b><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: 99, background: pieColors[item.name], marginRight: 6 }} />{item.name}</b><b>{item.count}</b></span>)}</div>
        </div>
      </div>
    </div>
    <div className="grid two-col"><div className="card pad"><div className="section-title"><h2>Funil por etapa</h2><button className="btn small" onClick={() => setScreen("kanban")}>Ver Kanban</button></div><div className="report-bars">{stages.map(s => { const count = deals.filter(d=>d.stage===s).length; return <div className="bar" key={s}><span><b>{s}</b><b>{count}</b></span><i style={{width: `${Math.max(8, count*22)}%`}} /></div> })}</div></div><div className="card pad"><div className="section-title"><h2>Próximos follow-ups</h2><span>{tasks.length} tarefas</span></div>{tasks.map(t => <div className="timeline-item" key={t.id}><b>{t.title}</b><br/><span className="notice">{t.owner} • {t.due}</span><div style={{ marginTop: 10 }}><Badge style={taskStatusBadgeStyle(t.status)}>{t.status}</Badge></div></div>)}</div></div><div className="card pad"><div className="section-title"><h2>Oportunidades recentes</h2><span>{deals.length} negócios</span></div><div className="table-wrap"><table><thead><tr><th>Oportunidade</th><th>Valor</th><th>Etapa</th><th>Responsável</th><th>Status</th></tr></thead><tbody>{deals.slice(0,7).map(d=><tr key={d.id}><td>{d.title}</td><td>{brl(d.value)}</td><td>{d.stage}</td><td>{d.owner}</td><td><Badge style={dealStatusBadgeStyle(d.status)}>{d.status}</Badge></td></tr>)}</tbody></table></div></div>
  </>;
}

function Leads(props: { leads: Lead[]; leadForm: any; setLeadForm: any; addLead: () => void; filter: string; setFilter: any; ownerFilter: string; setOwnerFilter: any; sourceFilter: string; setSourceFilter: any; tempFilter: string; setTempFilter: any; setSelectedLead: any; openConversation: (l: Lead) => void }) {
  const p = props;
  return <div className="grid"><div className="card pad"><div className="section-title"><h2>Novo lead</h2><span>Nome e WhatsApp são obrigatórios</span></div><div className="form-grid"><input className="input" placeholder="Nome" value={p.leadForm.name} onChange={e=>p.setLeadForm({...p.leadForm, name:e.target.value})}/><input className="input" placeholder="WhatsApp com DDI" value={p.leadForm.phone} onChange={e=>p.setLeadForm({...p.leadForm, phone:e.target.value})}/><input className="input" placeholder="E-mail" value={p.leadForm.email} onChange={e=>p.setLeadForm({...p.leadForm, email:e.target.value})}/><input className="input" placeholder="Cidade" value={p.leadForm.city} onChange={e=>p.setLeadForm({...p.leadForm, city:e.target.value})}/><select className="select" value={p.leadForm.source} onChange={e=>p.setLeadForm({...p.leadForm, source:e.target.value})}>{sources.map(s=><option key={s}>{s}</option>)}</select><select className="select" value={p.leadForm.owner} onChange={e=>p.setLeadForm({...p.leadForm, owner:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select><select className="select" value={p.leadForm.temperature} onChange={e=>p.setLeadForm({...p.leadForm, temperature:e.target.value as Temp})}><option>Quente</option><option>Morno</option><option>Frio</option></select><button className="btn primary" onClick={p.addLead}>Cadastrar lead</button></div></div><div className="card pad"><div className="filters"><input className="input" placeholder="Buscar por nome ou telefone" value={p.filter} onChange={e=>p.setFilter(e.target.value)}/><select className="select" value={p.ownerFilter} onChange={e=>p.setOwnerFilter(e.target.value)}><option>Todos</option>{users.map(u=><option key={u}>{u}</option>)}</select><select className="select" value={p.sourceFilter} onChange={e=>p.setSourceFilter(e.target.value)}><option>Todas</option>{sources.map(s=><option key={s}>{s}</option>)}</select><select className="select" value={p.tempFilter} onChange={e=>p.setTempFilter(e.target.value)}><option>Todas</option><option>Quente</option><option>Morno</option><option>Frio</option></select></div><div className="table-wrap"><table><thead><tr><th>Lead</th><th>WhatsApp</th><th>Cidade</th><th>Origem</th><th>Responsável</th><th>Temp.</th><th>Status</th><th>Ações</th></tr></thead><tbody>{p.leads.map(l=><tr key={l.id}><td><div className="client-line"><div className="avatar">{l.name[0]}</div><div><b>{l.name}</b><br/><span className="notice">{l.email}</span></div></div></td><td>{l.phone}</td><td>{l.city}</td><td>{l.source}</td><td>{l.owner}</td><td><Badge style={tempBadgeStyle(l.temperature)}>{l.temperature}</Badge></td><td><Badge style={leadStatusBadgeStyle(l.status)}>{l.status}</Badge></td><td><button className="btn small" onClick={()=>p.setSelectedLead(l)}>Ficha</button> <button className="btn small primary" onClick={()=>p.openConversation(l)}>Conversa</button></td></tr>)}</tbody></table></div></div></div>;
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
  return <div className="drawer"><div className="drawer-panel"><div className="section-title"><div><h1>{lead.name}</h1><p className="notice">{lead.city} • {lead.source} • {lead.owner}</p></div><button className="btn" onClick={onClose}>Fechar</button></div><div><Badge style={tempBadgeStyle(lead.temperature)}>{lead.temperature}</Badge> <Badge style={leadStatusBadgeStyle(lead.status)}>{lead.status}</Badge> {lead.tags.map(t=><Badge key={t}>{t}</Badge>)}</div><div className="tabs">{["Resumo","Oportunidades","Histórico","Tarefas","Conversa"].map(t=><button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{t}</button>)}</div>{tab==="Resumo" && <div className="card pad"><p><b>WhatsApp:</b> {lead.phone}</p><p><b>E-mail:</b> {lead.email}</p><p><b>Status:</b> {lead.status}</p><button className="btn primary" onClick={()=>openConversation(lead)}>Abrir conversa externa</button></div>}{tab==="Oportunidades" && <div className="grid">{deals.map(d=><div className="timeline-item" key={d.id}><b>{d.title}</b><br/>{brl(d.value)} • {d.stage} • <Badge style={dealStatusBadgeStyle(d.status)}>{d.status}</Badge></div>)}</div>}{tab==="Histórico" && <div className="timeline">{lead.history.map((h,i)=><div className="timeline-item" key={i}>{h}</div>)}</div>}{tab==="Tarefas" && <div className="timeline">{tasks.length?tasks.map(t=><div className="timeline-item" key={t.id}><b>{t.title}</b><br/>{t.due} • <Badge style={taskStatusBadgeStyle(t.status)}>{t.status}</Badge></div>):<div className="empty">Nenhuma tarefa vinculada.</div>}</div>}{tab==="Conversa" && <div className="grid"><button className="btn primary" onClick={()=>openConversation(lead)}>Abrir conversa externa</button>{messages.filter(m=>m.active).map(m=><div className="message-card" key={m.id}><b>{m.title}</b><p>{m.text}</p><button className="btn small" onClick={()=>copyMessage(m,lead)}>Copiar mensagem</button></div>)}</div>}</div></div>;
}
