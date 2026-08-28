"use client";

import { useEffect, useMemo, useState } from 'react';
import { demoLeads, demoOpportunities, demoQuickMessages, demoTasks } from '@/data/demo-data';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import { createRealLeadAndOpportunity, createRealTask, persistOpportunityLost, persistOpportunityStage, persistOpportunityWon, persistTaskCompleted, removeRealTask, statusFromStage, updateRealOpportunity, updateRealTask } from '@/lib/crm/real-persistence';
import { persistLeadActivity, removeRealLead, updateRealLead } from '@/lib/crm/lead-persistence';
import { getDefaultScreenForRole, normalizeRole } from '@/lib/crm/permissions';
import { hasActiveSupabaseSession, signInWithSupabaseOrDemo, signOutSupabase } from '@/lib/supabase/auth';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';
import { useCrmRealLoader } from '@/hooks/useCrmRealLoader';
import type { Lead, LeadStatus, LeadTemperature, Opportunity, OpportunityStatus, PipelineStage, QuickMessage, Screen, Task, TaskStatus, UserRole } from '@/types/crm';

type SessionMode = 'real' | 'demo' | null;
type LeadForm = { name: string; phone: string; email: string; city: string; source: string; owner: string; temperature: LeadTemperature; };
type LeadEditForm = LeadForm & { status: LeadStatus; };
type OpportunityEditForm = { title: string; value: number; stage: PipelineStage; owner: string; source: string; temperature: LeadTemperature; nextTask: string; status: OpportunityStatus; notes: string; probability?: number; expectedCloseDate?: string; };
type TaskForm = { title: string; leadId: number; owner: string; type: string; priority: Task['priority']; due: string; };
type TaskEditForm = TaskForm & { status: TaskStatus; };

const initialLeadForm: LeadForm = { name: '', phone: '', email: '', city: '', source: 'WhatsApp', owner: 'Equipe', temperature: 'Morno' };
const initialTaskForm: TaskForm = { title: '', leadId: 0, owner: 'Equipe', type: 'Ligar', priority: 'Média', due: '' };

export function useCrmMvpState() {
  const [logged, setLogged] = useState(false);
  const [sessionMode, setSessionMode] = useState<SessionMode>(null);
  const [loginNotice, setLoginNotice] = useState('');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [userRole, setUserRoleState] = useState<UserRole>('Admin Empresa');
  const [userName, setUserName] = useState('Usuário');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const [sourceFilter, setSourceFilter] = useState('Todas');
  const [tempFilter, setTempFilter] = useState('Todas');
  const [leadForm, setLeadForm] = useState<LeadForm>(initialLeadForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(initialTaskForm);
  const { loadingRealData, dataNotice, setDataNotice, reloadRealData, clearData } = useCrmRealLoader({ setLeads, setDeals, setTasks, setMessages });

  const demoMode = sessionMode === 'demo';

  function applyUserRole(role: UserRole) {
    setUserRoleState(role);
    setScreen(getDefaultScreenForRole(role));
    setSelectedLead(null);
  }

  async function loadCurrentUserProfile() {
    const profile = await getCurrentProfile();
    if (profile?.role) setUserRoleState(normalizeRole(profile.role));
    if (profile?.name) setUserName(profile.name);
  }

  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const hasSession = await hasActiveSupabaseSession();
      if (cancelled || !hasSession) return;
      setSessionMode('real');
      setLogged(true);
      await loadCurrentUserProfile();
      await reloadRealData();
    }
    restoreSession();
    return () => { cancelled = true; };
  }, [reloadRealData]);

  const filteredLeads = useMemo(() => leads.filter((lead) =>
    (lead.name.toLowerCase().includes(filter.toLowerCase()) || lead.phone.includes(filter)) &&
    (ownerFilter === 'Todos' || lead.owner === ownerFilter) &&
    (sourceFilter === 'Todas' || lead.source === sourceFilter) &&
    (tempFilter === 'Todas' || lead.temperature === tempFilter)
  ), [leads, filter, ownerFilter, sourceFilter, tempFilter]);

  async function login(email: string, password: string) {
    const result = await signInWithSupabaseOrDemo(email, password);
    setLoginNotice(result.message);
    if (!result.ok) {
      alert(result.message);
      return;
    }
    setSessionMode('real');
    setLogged(true);
    await loadCurrentUserProfile();
    await reloadRealData();
  }

  function enterDemo() {
    setSessionMode('demo');
    setUserRoleState('Admin Empresa');
    setUserName('Demonstração');
    setLeads(demoLeads);
    setDeals(demoOpportunities);
    setTasks(demoTasks);
    setMessages(demoQuickMessages);
    setDataNotice('Modo demonstração — dados fictícios, isolados e não persistidos.');
    setLogged(true);
  }

  async function logout() {
    if (!demoMode) await signOutSupabase();
    clearData();
    setLogged(false);
    setSessionMode(null);
    setScreen('dashboard');
    setSelectedLead(null);
    setUserRoleState('Admin Empresa');
    setUserName('Usuário');
  }

  function addHistory(leadId: number, text: string) {
    setLeads((current) => current.map((lead) => lead.id === leadId ? { ...lead, lastInteraction: 'agora', history: [text, ...lead.history] } : lead));
  }

  function persistenceError(message: string, error?: unknown) {
    console.error(message, error);
    alert(message + ' Nenhuma alteração fictícia foi aplicada.');
  }

  async function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert('Nome e WhatsApp são obrigatórios.');
    if (leads.some((lead) => lead.phone === leadForm.phone)) return alert('Possível duplicidade: já existe um lead com esse WhatsApp.');

    if (!demoMode) {
      try {
        const realResult = await createRealLeadAndOpportunity(leadForm, leads.length, deals.length);
        if (!realResult) return persistenceError('Não foi possível criar o lead no banco real.');
        setLeads((current) => [realResult.lead, ...current]);
        setDeals((current) => [realResult.deal, ...current]);
        setLeadForm(initialLeadForm);
        return;
      } catch (error) {
        return persistenceError('Não foi possível criar o lead no banco real.', error);
      }
    }

    const id = Date.now();
    const newLead: Lead = { id, ...leadForm, status: 'Lead', lastInteraction: 'agora', tags: ['Demo'], history: ['Lead criado na demonstração'] };
    setLeads((current) => [newLead, ...current]);
    setDeals((current) => [{ id: id + 1, leadId: id, title: 'Nova oportunidade', value: 0, stage: 'Novo Lead', owner: leadForm.owner, source: leadForm.source, temperature: leadForm.temperature, nextTask: 'Primeiro contato', late: false, status: 'Aberta', notes: 'Oportunidade da demonstração.' }, ...current]);
    setLeadForm(initialLeadForm);
  }

  async function updateLead(lead: Lead, form: LeadEditForm) {
    if (!demoMode) {
      try {
        const updated = await updateRealLead(lead, form, leads.findIndex((item) => item.id === lead.id) + 1);
        if (!updated) return persistenceError('Não foi possível atualizar o lead no banco real.');
        setLeads((current) => current.map((item) => item.id === lead.id ? updated : item));
        setSelectedLead(updated);
        return;
      } catch (error) { return persistenceError('Não foi possível atualizar o lead no banco real.', error); }
    }
    const updated = { ...lead, ...form, history: ['Dados atualizados na demonstração.', ...lead.history] };
    setLeads((current) => current.map((item) => item.id === lead.id ? updated : item));
    setSelectedLead(updated);
  }

  async function removeLead(lead: Lead) {
    if (!demoMode) {
      try { await removeRealLead(lead); } catch (error) { return persistenceError('Não foi possível excluir o lead do banco real.', error); }
    }
    setLeads((current) => current.filter((item) => item.id !== lead.id));
    setDeals((current) => current.filter((deal) => deal.leadId !== lead.id));
    setTasks((current) => current.filter((task) => task.leadId !== lead.id));
    setSelectedLead(null);
  }

  async function moveDeal(id: number, stage: PipelineStage) {
    const deal = deals.find((item) => item.id === id);
    if (!deal) return;
    const nextStatus = statusFromStage(stage);
    if (!demoMode) {
      try { await persistOpportunityStage(deal, stage); } catch (error) { return persistenceError('Não foi possível mover a oportunidade no banco real.', error); }
    }
    setDeals((current) => current.map((item) => item.id === id ? { ...item, stage, status: nextStatus } : item));
    addHistory(deal.leadId, `Oportunidade movida para ${stage}`);
  }

  async function updateDeal(deal: Opportunity, form: OpportunityEditForm) {
    if (!demoMode) {
      try {
        const updated = await updateRealOpportunity(deal, form, deals.findIndex((item) => item.id === deal.id) + 1);
        if (!updated) return persistenceError('Não foi possível atualizar a oportunidade no banco real.');
        setDeals((current) => current.map((item) => item.id === deal.id ? updated : item));
        addHistory(deal.leadId, `Oportunidade atualizada: ${form.title}`);
        return;
      } catch (error) { return persistenceError('Não foi possível atualizar a oportunidade no banco real.', error); }
    }
    setDeals((current) => current.map((item) => item.id === deal.id ? { ...deal, ...form } : item));
  }

  async function markWon(id: number) {
    const value = Number(prompt('Valor final da venda em R$:', '497'));
    if (!value) return alert('Venda ganha exige valor final.');
    const deal = deals.find((item) => item.id === id);
    if (!deal) return;
    if (!demoMode) {
      try { await persistOpportunityWon(deal, value); } catch (error) { return persistenceError('Não foi possível registrar a venda ganha no banco real.', error); }
    }
    setDeals((current) => current.map((item) => item.id === id ? { ...item, value, stage: 'Fechado', status: 'Ganha' } : item));
    addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);
  }

  async function markLost(id: number) {
    const reason = prompt('Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?');
    if (!reason) return alert('Venda perdida exige motivo.');
    const deal = deals.find((item) => item.id === id);
    if (!deal) return;
    if (!demoMode) {
      try { await persistOpportunityLost(deal, reason); } catch (error) { return persistenceError('Não foi possível registrar a perda no banco real.', error); }
    }
    setDeals((current) => current.map((item) => item.id === id ? { ...item, stage: 'Perdido', status: 'Perdida', notes: `${item.notes} Motivo da perda: ${reason}.` } : item));
    addHistory(deal.leadId, `Venda perdida. Motivo: ${reason}`);
  }

  function openConversation(lead: Lead) {
    addHistory(lead.id, 'Conversa aberta pelo CRM');
    if (!demoMode) persistLeadActivity(lead, 'Conversa externa aberta pelo CRM.', 'conversation_opened').catch(console.error);
    window.open(`https://wa.me/${lead.phone}`, '_blank');
  }

  function copyMessage(msg: QuickMessage, lead?: Lead) {
    navigator.clipboard?.writeText(msg.text);
    if (lead) {
      addHistory(lead.id, `Mensagem copiada: ${msg.title}`);
      if (!demoMode) persistLeadActivity(lead, `Mensagem rápida copiada: ${msg.title}.`, 'quick_message').catch(console.error);
    }
    alert('Mensagem copiada.');
  }

  async function addLeadNote(lead: Lead, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    const entry = `Anotação: ${trimmed}`;
    if (!demoMode) {
      try { await persistLeadActivity(lead, entry, 'manual_note'); } catch (error) { return persistenceError('Não foi possível salvar a anotação no banco real.', error); }
    }
    addHistory(lead.id, entry);
    setSelectedLead({ ...lead, lastInteraction: 'agora', history: [entry, ...lead.history] });
  }

  async function addTask() {
    if (!taskForm.title.trim()) return alert('A tarefa precisa de título.');
    const selectedTaskLead = leads.find((lead) => lead.id === Number(taskForm.leadId));
    if (!demoMode) {
      try {
        const realTask = await createRealTask(taskForm, selectedTaskLead, tasks.length);
        if (!realTask) return persistenceError('Não foi possível criar a tarefa no banco real.');
        setTasks((current) => [realTask, ...current]);
        addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
        setTaskForm(initialTaskForm);
        return;
      } catch (error) { return persistenceError('Não foi possível criar a tarefa no banco real.', error); }
    }
    setTasks((current) => [{ id: Date.now(), ...taskForm, status: 'Pendente' }, ...current]);
    addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
    setTaskForm(initialTaskForm);
  }

  async function completeTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (!demoMode) {
      try { await persistTaskCompleted(task); } catch (error) { return persistenceError('Não foi possível concluir a tarefa no banco real.', error); }
    }
    setTasks((current) => current.map((item) => item.id === taskId ? { ...item, status: 'Concluída' } : item));
  }

  async function updateTaskItem(task: Task, form: TaskEditForm) {
    const selectedTaskLead = leads.find((lead) => lead.id === Number(form.leadId));
    if (!demoMode) {
      try {
        const updated = await updateRealTask(task, form, selectedTaskLead, tasks.findIndex((item) => item.id === task.id) + 1);
        if (!updated) return persistenceError('Não foi possível atualizar a tarefa no banco real.');
        setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
        return;
      } catch (error) { return persistenceError('Não foi possível atualizar a tarefa no banco real.', error); }
    }
    setTasks((current) => current.map((item) => item.id === task.id ? { ...task, ...form, leadName: selectedTaskLead?.name || task.leadName } : item));
  }

  async function removeTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);
    if (!demoMode) {
      try { await removeRealTask(task); } catch (error) { return persistenceError('Não foi possível remover a tarefa do banco real.', error); }
    }
    setTasks((current) => current.filter((item) => item.id !== taskId));
  }

  return {
    logged, setLogged, sessionMode, demoMode, login, enterDemo, logout, loginNotice,
    screen, setScreen, userRole, setUserRole: applyUserRole, userName,
    leads, deals, tasks, setTasks, messages, setMessages,
    selectedLead, setSelectedLead,
    filter, setFilter, ownerFilter, setOwnerFilter, sourceFilter, setSourceFilter, tempFilter, setTempFilter,
    leadForm, setLeadForm, taskForm, setTaskForm, filteredLeads,
    loadingRealData, dataNotice: demoMode ? 'Modo demonstração — dados fictícios, isolados e não persistidos.' : dataNotice,
    addLead, updateLead, removeLead, moveDeal, updateDeal, markWon, markLost, openConversation, copyMessage, addLeadNote,
    addTask, completeTask, updateTaskItem, removeTask, reloadRealData
  };
}
