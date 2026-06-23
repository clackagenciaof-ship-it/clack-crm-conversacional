"use client";

import { Login } from "@/components/auth/Login";
import { AtendimentoPage } from "@/components/atendimento/AtendimentoPage";
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
import { canAccessScreen, getDefaultScreenForRole, roleDescriptions } from "@/lib/crm/permissions";
import { useCrmMvpState } from "@/hooks/useCrmMvpState";

export default function Home() {
  const crm = useCrmMvpState();

  if (!crm.logged) return <Login onLogin={crm.login} />;

  const canAccessCurrentScreen = canAccessScreen(crm.userRole, crm.screen);

  function safeSetScreen(nextScreen: typeof crm.screen) {
    crm.setScreen(canAccessScreen(crm.userRole, nextScreen) ? nextScreen : getDefaultScreenForRole(crm.userRole));
  }

  return (
    <AppShell screen={crm.screen} setScreen={safeSetScreen} userRole={crm.userRole}>
      <Header screen={crm.screen} setScreen={safeSetScreen} dataNotice={crm.dataNotice} loadingRealData={crm.loadingRealData} userRole={crm.userRole} onLogout={crm.logout} />

      {!canAccessCurrentScreen && (
        <div className="card pad access-card">
          <h2>Acesso ajustado ao seu perfil</h2>
          <p className="notice">{roleDescriptions[crm.userRole]}</p>
          <button className="btn primary" onClick={() => crm.setScreen(getDefaultScreenForRole(crm.userRole))}>Ir para minha área</button>
        </div>
      )}

      {canAccessCurrentScreen && crm.screen === "dashboard" && (
        <DashboardPage leads={crm.leads} deals={crm.deals} tasks={crm.tasks} setScreen={safeSetScreen} />
      )}

      {canAccessCurrentScreen && crm.screen === "leads" && (
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
          removeLead={crm.removeLead}
        />
      )}

      {canAccessCurrentScreen && crm.screen === "kanban" && (
        <KanbanPage
          leads={crm.leads}
          deals={crm.deals}
          moveDeal={crm.moveDeal}
          updateDeal={crm.updateDeal}
          markWon={crm.markWon}
          markLost={crm.markLost}
          openConversation={crm.openConversation}
          setSelectedLead={crm.setSelectedLead}
        />
      )}

      {canAccessCurrentScreen && crm.screen === "tasks" && (
        <TasksPage
          tasks={crm.tasks}
          leads={crm.leads}
          taskForm={crm.taskForm}
          setTaskForm={crm.setTaskForm}
          addTask={crm.addTask}
          completeTask={crm.completeTask}
          updateTaskItem={crm.updateTaskItem}
          removeTask={crm.removeTask}
        />
      )}

      {canAccessCurrentScreen && crm.screen === "messages" && (
        <MessagesPage messages={crm.messages} setMessages={crm.setMessages} copyMessage={crm.copyMessage} />
      )}

      {canAccessCurrentScreen && crm.screen === "inbox" && <AtendimentoPage />}

      {canAccessCurrentScreen && crm.screen === "reports" && (
        <ReportsPage leads={crm.leads} deals={crm.deals} tasks={crm.tasks} />
      )}

      {canAccessCurrentScreen && crm.screen === "settings" && (
        <SettingsPage currentRole={crm.userRole} currentUserName={crm.userName} setUserRole={crm.setUserRole} />
      )}

      {crm.selectedLead && canAccessCurrentScreen && (
        <LeadDrawer
          lead={crm.selectedLead}
          deals={crm.deals.filter((deal) => deal.leadId === crm.selectedLead?.id)}
          tasks={crm.tasks.filter((task) => task.leadId === crm.selectedLead?.id)}
          messages={crm.messages}
          onClose={() => crm.setSelectedLead(null)}
          openConversation={crm.openConversation}
          copyMessage={crm.copyMessage}
          updateLead={crm.updateLead}
          addLeadNote={crm.addLeadNote}
        />
      )}
    </AppShell>
  );
}
