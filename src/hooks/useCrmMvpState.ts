"use client";

import { useMemo, useState } from 'react';
import { demoLeads, demoOpportunities, demoQuickMessages, demoTasks } from '@/data/demo-data';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import { signInWithSupabaseOrDemo, signOutSupabase } from '@/lib/supabase/auth';
import { useCrmRealLoader } from '@/hooks/useCrmRealLoader';
import type { Lead, LeadTemperature, Opportunity, PipelineStage, QuickMessage, Screen, Task } from '@/types/crm';

type LeadForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
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
  const { loadingRealData, dataNotice } = useCrmRealLoader({ setLeads, setDeals, setTasks, setMessages });

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

  function addLead() {
    if (!leadForm.name.trim() || !leadForm.phone.trim()) return alert('Nome e WhatsApp são obrigatórios.');
    if (leads.some((lead) => lead.phone === leadForm.phone)) return alert('Possível duplicidade: já existe um lead com esse WhatsApp.');

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

  function moveDeal(id: number, stage: PipelineStage) {
    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id
        ? { ...deal, stage, status: stage === 'Fechado' ? 'Ganha' : stage === 'Perdido' ? 'Perdida' : 'Aberta' }
        : deal
    ));
    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Oportunidade movida para ${stage}`);
  }

  function markWon(id: number) {
    const value = Number(prompt('Valor final da venda em R$:', '497'));
    if (!value) return alert('Venda ganha exige valor final.');

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id ? { ...deal, value, stage: 'Fechado', status: 'Ganha' } : deal
    ));
    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Venda ganha no valor de ${brl(value)}`);
  }

  function markLost(id: number) {
    const reason = prompt('Motivo da perda: sem orçamento, sem interesse, concorrente, preço alto ou outro?');
    if (!reason) return alert('Venda perdida exige motivo.');

    setDeals((currentDeals) => currentDeals.map((deal) =>
      deal.id === id
        ? { ...deal, stage: 'Perdido', status: 'Perdida', notes: `${deal.notes} Motivo da perda: ${reason}.` }
        : deal
    ));
    const deal = deals.find((item) => item.id === id);
    if (deal) addHistory(deal.leadId, `Venda perdida. Motivo: ${reason}`);
  }

  function openConversation(lead: Lead) {
    addHistory(lead.id, 'Conversa externa aberta pelo CRM');
    window.open(`https://wa.me/${lead.phone}`, '_blank');
  }

  function copyMessage(msg: QuickMessage, lead?: Lead) {
    navigator.clipboard?.writeText(msg.text);
    if (lead) addHistory(lead.id, `Mensagem rápida copiada: ${msg.title}`);
    alert('Mensagem copiada.');
  }

  function addTask() {
    if (!taskForm.title.trim()) return alert('A tarefa precisa de título.');
    setTasks([{ id: Date.now(), ...taskForm, status: 'Pendente' }, ...tasks]);
    addHistory(Number(taskForm.leadId), `Tarefa criada: ${taskForm.title}`);
    setTaskForm(initialTaskForm);
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
    moveDeal,
    markWon,
    markLost,
    openConversation,
    copyMessage,
    addTask
  };
}
