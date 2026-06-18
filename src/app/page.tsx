"use client";

import { Login } from "@/components/auth/Login";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { KanbanPage } from "@/components/kanban/KanbanPage";
import { AppShell } from "@/components/layout/AppShell";
import { Header } from "@/components/layout/Header";
import { LeadDrawer } from "@/components/leads/LeadDrawer";
import { LeadsPage } from "@/components/leads/LeadsPage";
import { MessagesPage } from "@/components/messages/MessagesPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { TasksPage } from "@/components/tasks/TasksPage";
import { useCrmMvpState } from "@/hooks/useCrmMvpState";

export default function Home() {
  const crm = useCrmMvpState();

  if (!crm.logged) return <Login onLogin={crm.login} />;

  return (
    <AppShell screen={crm.screen} setScreen={crm.setScreen}>
      <Header screen={crm.screen} setScreen={crm.setScreen} dataNotice={crm.dataNotice} loadingRealData={crm.loadingRealData} onLogout={crm.logout} />

      {crm.screen === "dashboard" && (
        <DashboardPage leads={crm.leads} deals={crm.deals} tasks={crm.tasks} setScreen={crm.setScreen} />
      )}

      {crm.screen === "leads" && (
        <LeadsPage
          leads={crm.filteredLeads}
          leadForm={crm.leadForm}
          setLeadForm={crm.setLeadForm}
          addLead={crm.addLead}
          filter={crm.filter}
          setFilter={crm.setFilter}
          ownerFilter={crm.ownerFilter}
          setOwnerFilter={crm.setOwnerFilter}
          sourceFilter={crm.sourceFilter}
          setSourceFilter={crm.setSourceFilter}
          tempFilter={crm.tempFilter}
          setTempFilter={crm.setTempFilter}
          setSelectedLead={crm.setSelectedLead}
          openConversation={crm.openConversation}
        />
      )}

      {crm.screen === "kanban" && (
        <KanbanPage
          leads={crm.leads}
          deals={crm.deals}
          moveDeal={crm.moveDeal}
          markWon={crm.markWon}
          markLost={crm.markLost}
          openConversation={crm.openConversation}
          setSelectedLead={crm.setSelectedLead}
        />
      )}

      {crm.screen === "tasks" && (
        <TasksPage
          tasks={crm.tasks}
          leads={crm.leads}
          taskForm={crm.taskForm}
          setTaskForm={crm.setTaskForm}
          addTask={crm.addTask}
          completeTask={crm.completeTask}
        />
      )}

      {crm.screen === "messages" && (
        <MessagesPage messages={crm.messages} setMessages={crm.setMessages} copyMessage={crm.copyMessage} />
      )}

      {crm.screen === "reports" && (
        <ReportsPage leads={crm.leads} deals={crm.deals} tasks={crm.tasks} />
      )}

      {crm.screen === "settings" && <SettingsPage />}

      {crm.selectedLead && (
        <LeadDrawer
          lead={crm.selectedLead}
          deals={crm.deals.filter((deal) => deal.leadId === crm.selectedLead?.id)}
          tasks={crm.tasks.filter((task) => task.leadId === crm.selectedLead?.id)}
          messages={crm.messages}
          onClose={() => crm.setSelectedLead(null)}
          openConversation={crm.openConversation}
          copyMessage={crm.copyMessage}
          updateLead={crm.updateLead}
        />
      )}
    </AppShell>
  );
}
