"use client";

import { useMemo, useState } from "react";
import { Login } from "@/components/auth/Login";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { KanbanPage } from "@/components/kanban/KanbanPage";
import { AppShell } from "@/components/layout/AppShell";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { MessagesPage } from "@/components/messages/MessagesPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { TasksPage } from "@/components/tasks/TasksPage";
import { demoLeads, demoOpportunities, demoQuickMessages, demoTasks } from "@/data/demo-data";
import { formatCurrencyBRL as brl } from "@/lib/crm/formatters";
import type { Lead, LeadTemperature, Opportunity, PipelineStage, QuickMessage, Screen, Task } from "@/types/crm";

type Temp = LeadTemperature;
type Stage = PipelineStage;
type Deal = Opportunity;

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

  const filteredLeads = useMemo(() => leads.filter((lead) =>
    (lead.name.toLowerCase().includes(filter.toLowerCase()) || lead.phone.includes(filter)) &&
    (ownerFilter === "Todos" || lead.owner === ownerFilter) &&
    (sourceFilter === "Todas" || lead.source === sourceFilter) &&
    (tempFilter === "Todas" || lead.temperature === tempFilter)
  ), [leads, filter, ownerFilter, sourceFilter, tempFilter]);

  function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert("Nome e WhatsApp são obrigatórios.");
    if (leads.some((lead) => lead.phone === leadForm.phone)) return alert("Possível duplicidade: já existe um lead com esse WhatsApp.");

    const id = Date.now();
    const newLead: Lead = {
      id,
      ...leadForm,
      status: "Lead",
      lastInteraction: "agora",
      tags: ["Novo"],
      history: ["Lead criado manualmente"]
    };

    setLeads([newLead, ...leads]);
    setDeals([
      {
        id: Date.now() + 1,
        leadId: id,
        title: "Nova oportunidade",
        value: 0,
        stage: "Novo Lead",
        owner: leadForm.owner,
        source: leadForm.source,
        temperature: leadForm.temperature,
        nextTask: "Primeiro contato",
        late: false,
        status: "Aberta",
        notes: "Criada junto ao novo lead."
      },
      ...deals
    ]);
    setLeadForm({ name: "", phone: "", email: "", city: "", source: "Instagram", owner: "Lucas", temperature: "Quente" });
  }

  function addHistory(leadId: number, text: string) {
    setLeads((currentLeads) => currentLeads.map((lead) =>
      lead.id === leadId ? { ...lead, lastInteraction: "agora", history: [text, ...lead.history] } : lead
    ));
  }

  function moveDeal(id: number, stage: Stage) {
    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id
        ? { ...deal, stage, status: stage === "Fechado" ? "Ganha" : stage === "Perdido" ? "Perdida" : "Aberta" }
        : deal
    ));
    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Oportunidade movida para ${stage}`);
  }

  function markWon(id: number) {
    const value = Number(prompt("Valor final da venda em R$:", "497"));
    if (!value) return alert("Venda ganha exige valor final.");

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id ? { ...deal, value, stage: "Fechado", status: "Ganha" } : deal
    ));
    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);
  }

  function markLost(id: number) {
    const reason = prompt("Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?");
    if (!reason) return alert("Venda perdida exige motivo.");

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id
        ? { ...deal, stage: "Perdido", status: "Perdida", notes: `${deal.notes} Motivo da perda: ${reason}.` }
        : deal
    ));
    const deal = deals.find((item) => item.id === id);
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
      {screen === "kanban" && <KanbanPage leads={leads} deals={deals} moveDeal={moveDeal} markWon={markWon} markLost={markLost} openConversation={openConversation} setSelectedLead={setSelectedLead} />}
      {screen === "tasks" && <TasksPage tasks={tasks} setTasks={setTasks} leads={leads} taskForm={taskForm} setTaskForm={setTaskForm} addTask={addTask} />}
      {screen === "messages" && <MessagesPage messages={messages} setMessages={setMessages} copyMessage={copyMessage} />}
      {screen === "reports" && <ReportsPage leads={leads} deals={deals} tasks={tasks} />}
      {screen === "settings" && <SettingsPage />}
      {selectedLead && <LeadDrawer lead={selectedLead} deals={deals.filter((deal) => deal.leadId === selectedLead.id)} tasks={tasks.filter((task) => task.leadId === selectedLead.id)} messages={messages} onClose={() => setSelectedLead(null)} openConversation={openConversation} copyMessage={copyMessage} />}
    </AppShell>
  );
}

function Header({ screen, setScreen }: { screen: Screen, setScreen: (screen: Screen) => void }) {
  const titles: Record<Screen, string> = {
    dashboard: "Dashboard comercial",
    leads: "Contatos e leads",
    kanban: "Kanban comercial",
    tasks: "Tarefas e follow-ups",
    messages: "Mensagens rápidas",
    reports: "Relatórios",
    settings: "Configurações"
  };

  return (
    <div className="topbar">
      <div>
        <h1>{titles[screen]}</h1>
        <p>Clack Growth Company • MVP 1 operacional</p>
      </div>
      <div className="top-actions">
        <button className="btn" onClick={() => setScreen("leads")}>Novo Lead</button>
        <button className="btn primary" onClick={() => setScreen("kanban")}>Abrir Funil</button>
      </div>
    </div>
  );
}
