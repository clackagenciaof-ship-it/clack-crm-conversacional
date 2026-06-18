"use client";

import { useEffect, useMemo, useState } from 'react';
import { demoLeads, demoOpportunities, demoQuickMessages, demoTasks } from '@/data/demo-data';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import { createRealLeadAndOpportunity, createRealTask, persistOpportunityLost, persistOpportunityStage, persistOpportunityWon, persistTaskCompleted, statusFromStage } from '@/lib/crm/real-persistence';
import { persistLeadActivity, removeRealLead, updateRealLead } from '@/lib/crm/lead-persistence';
import { hasActiveSupabaseSession, signInWithSupabaseOrDemo, signOutSupabase } from '@/lib/supabase/auth';
import { useCrmRealLoader } from '@/hooks/useCrmRealLoader';
import type { Lead, LeadStatus, LeadTemperature, Opportunity, PipelineStage, QuickMessage, Screen, Task } from '@/types/crm';

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
};

type LeadEditForm = LeadForm & {
  status: LeadStatus;
};

type TaskForm = {
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: Task['priority'];
  due: string;
};

const initialLeadForm: LeadForm = {
  name: '',
  phone: '',
  email: '',
  city: '',
  source: 'Instagram',
  owner: 'Lucas',
  temperature: 'Quente'
};

const initialTaskForm: TaskForm = {
  title: '',
  leadId: 1,
  owner: 'Lucas',
  type: 'Ligar',
  priority: 'Média',
  due: 'Hoje 18:00'
};

export function useCrmMvpState() {
  const [logged, setLogged] = useState(false);
  const [loginNotice, setLoginNotice] = useState('');
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const [deals, setDeals] = useState<Opportunity[]>(demoOpportunities);
  const [tasks, setTasks] = useState<Task[]>(demoTasks);
  const [messages, setMessages] = useState<QuickMessage[]>(demoQuickMessages);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filter, setFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const [sourceFilter, setSourceFilter] = useState('Todas');
  const [tempFilter, setTempFilter] = useState('Todas');
  const [leadForm, setLeadForm] = useState<LeadForm>(initialLeadForm);
  const [taskForm, setTaskForm] = useState<TaskForm>(initialTaskForm);
  const { loadingRealData, dataNotice, reloadRealData } = useCrmRealLoader({ setLeads, setDeals, setTasks, setMessages });

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      const hasSession = await hasActiveSupabaseSession();
      if (cancelled || !hasSession) return;

      setLogged(true);
      setLoginNotice('Sessão Supabase restaurada.');
      await reloadRealData();
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
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

    if (result.mode === 'supabase') {
      await reloadRealData();
    }

    setLogged(true);
  }

  async function logout() {
    await signOutSupabase();
    setLogged(false);
    setScreen('dashboard');
    setSelectedLead(null);
  }

  function addHistory(leadId: number, text: string) {
    setLeads((currentLeads) => currentLeads.map((lead) =>
      lead.id === leadId ? { ...lead, lastInteraction: 'agora', history: [text, ...lead.history] } : lead
    ));
  }

  async function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert('Nome e WhatsApp são obrigatórios.');
    if (leads.some((lead) => lead.phone === leadForm.phone)) return alert('Possível duplicidade: já existe um lead com esse WhatsApp.');

    try {
      const realResult = await createRealLeadAndOpportunity(leadForm, leads.length, deals.length);
      if (realResult) {
        setLeads([realResult.lead, ...leads]);
        setDeals([realResult.deal, ...deals]);
        setLeadForm(initialLeadForm);
        return;
      }
    } catch (error) {
      console.error('Falha ao salvar lead real. Usando fallback local.', error);
      alert('Não foi possível salvar no Supabase agora. O lead ficará localmente nesta sessão.');
    }

    const id = Date.now();
    const newLead: Lead = {
      id,
      ...leadForm,
      status: 'Lead',
      lastInteraction: 'agora',
      tags: ['Novo'],
      history: ['Lead criado manualmente']
    };

    setLeads([newLead, ...leads]);
    setDeals([
      {
        id: Date.now() + 1,
        leadId: id,
        title: 'Nova oportunidade',
        value: 0,
        stage: 'Novo Lead',
        owner: leadForm.owner,
        source: leadForm.source,
        temperature: leadForm.temperature,
        nextTask: 'Primeiro contato',
        late: false,
        status: 'Aberta',
        notes: 'Criada junto ao novo lead.'
      },
      ...deals
    ]);
    setLeadForm(initialLeadForm);
  }

  async function updateLead(lead: Lead, form: LeadEditForm) {
    try {
      const updatedLead = await updateRealLead(lead, form, leads.findIndex((item) => item.id === lead.id) + 1);
      const fallbackLead = updatedLead || { ...lead, ...form, history: ['Dados atualizados no CRM.', ...lead.history] };
      setLeads((currentLeads) => currentLeads.map((item) => item.id === lead.id ? fallbackLead : item));
      setSelectedLead(fallbackLead);
      return;
    } catch (error) {
      console.error('Falha ao editar lead real. Atualizando localmente.', error);
      const fallbackLead = { ...lead, ...form, history: ['Dados atualizados localmente.', ...lead.history] };
      setLeads((currentLeads) => currentLeads.map((item) => item.id === lead.id ? fallbackLead : item));
      setSelectedLead(fallbackLead);
    }
  }

  async function removeLead(lead: Lead) {
    try {
      await removeRealLead(lead);
    } catch (error) {
      console.error('Falha ao remover lead real. Removendo localmente.', error);
    }

    setLeads((currentLeads) => currentLeads.filter((item) => item.id !== lead.id));
    setDeals((currentDeals) => currentDeals.filter((deal) => deal.leadId !== lead.id));
    setTasks((currentTasks) => currentTasks.filter((task) => task.leadId !== lead.id));
    setSelectedLead(null);
  }

  async function moveDeal(id: number, stage: PipelineStage) {
    const nextStatus = statusFromStage(stage);
    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id ? { ...deal, stage, status: nextStatus } : deal
    ));

    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Oportunidade movida para ${stage}`);

    try {
      if (deal) await persistOpportunityStage(deal, stage);
    } catch (error) {
      console.error('Falha ao persistir mudança de etapa.', error);
    }
  }

  async function markWon(id: number) {
    const value = Number(prompt('Valor final da venda em R$:', '497'));
    if (!value) return alert('Venda ganha exige valor final.');

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id ? { ...deal, value, stage: 'Fechado', status: 'Ganha' } : deal
    ));

    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);

    try {
      if (deal) await persistOpportunityWon(deal, value);
    } catch (error) {
      console.error('Falha ao persistir venda ganha.', error);
    }
  }

  async function markLost(id: number) {
    const reason = prompt('Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?');
    if (!reason) return alert('Venda perdida exige motivo.');

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id
        ? { ...deal, stage: 'Perdido', status: 'Perdida', notes: `${deal.notes} Motivo da perda: ${reason}.` }
        : deal
    ));

    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Venda perdida. Motivo: ${reason}`);

    try {
      if (deal) await persistOpportunityLost(deal, reason);
    } catch (error) {
      console.error('Falha ao persistir venda perdida.', error);
    }
  }

  function openConversation(lead: Lead) {
    addHistory(lead.id, 'Conversa externa aberta pelo CRM');
    persistLeadActivity(lead, 'Conversa externa aberta pelo CRM.', 'conversation_opened').catch(console.error);
    window.open(`https://wa.me/${lead.phone}`, '_blank');
  }

  function copyMessage(msg: QuickMessage, lead?: Lead) {
    navigator.clipboard?.writeText(msg.text);
    if (lead) {
      addHistory(lead.id, `Mensagem rápida copiada: ${msg.title}`);
      persistLeadActivity(lead, `Mensagem rápida copiada: ${msg.title}.`, 'quick_message').catch(console.error);
    }
    alert('Mensagem copiada.');
  }

  async function addLeadNote(lead: Lead, note: string) {
    const trimmedNote = note.trim();
    if (!trimmedNote) return;

    const entry = `Anotação: ${trimmedNote}`;
    addHistory(lead.id, entry);
    setSelectedLead({ ...lead, lastInteraction: 'agora', history: [entry, ...lead.history] });

    try {
      await persistLeadActivity(lead, entry, 'manual_note');
    } catch (error) {
      console.error('Falha ao salvar anotação no histórico real.', error);
    }
  }

  async function addTask() {
    if (!taskForm.title.trim()) return alert('A tarefa precisa de título.');

    const selectedTaskLead = leads.find((lead) => lead.id === Number(taskForm.leadId));

    try {
      const realTask = await createRealTask(taskForm, selectedTaskLead, tasks.length);
      if (realTask) {
        setTasks([realTask, ...tasks]);
        addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
        setTaskForm(initialTaskForm);
        return;
      }
    } catch (error) {
      console.error('Falha ao salvar tarefa real. Usando fallback local.', error);
      alert('Não foi possível salvar a tarefa no Supabase agora. Ela ficará localmente nesta sessão.');
    }

    setTasks([{ id: Date.now(), ...taskForm, status: 'Pendente' }, ...tasks]);
    addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
    setTaskForm(initialTaskForm);
  }

  async function completeTask(taskId: number) {
    const task = tasks.find((item) => item.id === taskId);
    setTasks((currentTasks) => currentTasks.map((item) =>
      item.id === taskId ? { ...item, status: 'Concluída' } : item
    ));

    try {
      await persistTaskCompleted(task);
    } catch (error) {
      console.error('Falha ao persistir conclusão da tarefa.', error);
    }
  }

  return {
    logged,
    setLogged,
    login,
    logout,
    loginNotice,
    screen,
    setScreen,
    leads,
    deals,
    tasks,
    setTasks,
    messages,
    setMessages,
    selectedLead,
    setSelectedLead,
    filter,
    setFilter,
    ownerFilter,
    setOwnerFilter,
    sourceFilter,
    setSourceFilter,
    tempFilter,
    setTempFilter,
    leadForm,
    setLeadForm,
    taskForm,
    setTaskForm,
    filteredLeads,
    loadingRealData,
    dataNotice,
    addLead,
    updateLead,
    removeLead,
    moveDeal,
    markWon,
    markLost,
    openConversation,
    copyMessage,
    addLeadNote,
    addTask,
    completeTask
  };
}
