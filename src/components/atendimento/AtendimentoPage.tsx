"use client";

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile, listCompanyProfiles, listQuickMessages, listWhatsAppConversations, listWhatsAppMessages, type ProfileRow } from '@/lib/supabase/crm-repository';
import { loadChatbotFlows, type ChatbotFlow, type ChatbotFlowStep } from '@/lib/crm/flow-admin';
import type { QuickMessage } from '@/types/crm';

type Conversa = {
  id: string;
  contact_id?: string | null;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  priority?: string;
  channel?: string;
  assigned_to?: string | null;
  last_message_at: string | null;
};

type Mensagem = {
  id: string;
  direction: string;
  body: string | null;
  status: string;
  created_at: string;
};

const statusOptions = ['Aberta', 'Em atendimento', 'Resolvida', 'Arquivada'];
const filterOptions = ['Todas', ...statusOptions];
const priorityOptions = ['Baixa', 'Normal', 'Alta', 'Urgente'];

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function mapQuickMessage(row: any, index: number): QuickMessage {
  return {
    id: index + 1,
    dbId: row.id,
    title: row.title,
    category: row.category,
    active: row.active,
    text: row.content
  };
}

function tokenizeTriggers(value?: string | null) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function AtendimentoPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [currentProfile, setCurrentProfile] = useState<ProfileRow | null>(null);
  const [team, setTeam] = useState<ProfileRow[]>([]);
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [flowSteps, setFlowSteps] = useState<ChatbotFlowStep[]>([]);
  const [selectedFlowId, setSelectedFlowId] = useState('');
  const [selectedStepId, setSelectedStepId] = useState('');
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [testName, setTestName] = useState('Cliente Teste');
  const [testPhone, setTestPhone] = useState('5598999999999');
  const [testMessage, setTestMessage] = useState('Olá, quero saber mais sobre a proposta.');
  const [creatingTest, setCreatingTest] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [ownerFilter, setOwnerFilter] = useState('Todos');
  const [priorityFilter, setPriorityFilter] = useState('Todas');
  const [transferTo, setTransferTo] = useState('');

  async function getAccessToken() {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) throw new Error('Supabase não configurado.');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente no CRM.');
    return token;
  }

  function assigneeName(id?: string | null) {
    if (!id) return 'Sem responsável';
    return team.find((member) => member.id === id)?.name || 'Responsável não identificado';
  }

  async function loadInbox() {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);
      setCurrentProfile(profile);

      const [conversationRows, teamRows, messageRows, flowData] = await Promise.all([
        listWhatsAppConversations(profile.company_id),
        listCompanyProfiles(profile.company_id),
        listQuickMessages(profile.company_id),
        loadChatbotFlows().catch(() => ({ flows: [], steps: [] }))
      ]);

      setTeam(teamRows.filter((member) => member.status === 'active'));
      setQuickMessages((messageRows || []).map(mapQuickMessage).filter((message) => message.active));
      setFlows((flowData.flows || []).filter((flow) => flow.active));
      setFlowSteps(flowData.steps || []);

      const nextConversas = conversationRows as Conversa[];
      setConversas(nextConversas);
      if (!selectedConversa && nextConversas[0]) setSelectedConversa(nextConversas[0]);
    } catch (error) {
      console.error('Falha ao carregar atendimento.', error);
    } finally {
      setLoading(false);
    }
  }

  async function openConversa(conversa: Conversa) {
    setSelectedConversa(conversa);
    if (!companyId) return;

    setLoadingMessages(true);
    try {
      const data = await listWhatsAppMessages(companyId, conversa.id);
      setMensagens(data as Mensagem[]);
    } catch (error) {
      console.error('Falha ao carregar mensagens da conversa.', error);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function updateConversation(payload: { status?: string; assignedTo?: string | null; priority?: string }, successMessage?: string) {
    if (!selectedConversa) return;

    setChangingStatus(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/atendimento/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: selectedConversa.id, ...payload })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível atualizar a conversa.');
        return;
      }

      const updated = result.conversation as Conversa;
      setSelectedConversa(updated);
      setConversas((current) => current.map((conversa) => conversa.id === updated.id ? updated : conversa));
      if (successMessage) alert(successMessage);
    } catch (error) {
      console.error('Falha ao atualizar atendimento.', error);
      alert('Não foi possível atualizar a conversa.');
    } finally {
      setChangingStatus(false);
    }
  }

  async function createTestConversation() {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) { alert('Supabase não configurado neste ambiente.'); return; }

    const profile = await getCurrentProfile();
    if (!profile?.company_id) { alert('Usuário sem empresa vinculada.'); return; }

    const phone = normalizePhone(testPhone);
    if (!phone || !testMessage.trim()) { alert('Informe telefone e mensagem de teste.'); return; }

    setCreatingTest(true);
    try {
      const now = new Date().toISOString();
      const { data: conversa, error: conversaError } = await supabase
        .from('whatsapp_conversations')
        .insert({ company_id: profile.company_id, customer_phone: phone, customer_name: testName.trim() || 'Cliente Teste', status: 'Aberta', priority: 'Normal', channel: 'WhatsApp', assigned_to: profile.id, last_message_at: now })
        .select('*')
        .single();

      if (conversaError) throw conversaError;

      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({ company_id: profile.company_id, conversation_id: conversa.id, direction: 'inbound', from_phone: phone, to_phone: 'CRM', message_type: 'text', body: testMessage.trim(), status: 'received', raw_payload: { source: 'manual_test' }, created_at: now });

      if (messageError) throw messageError;

      await loadInbox();
      await openConversa(conversa as Conversa);
      alert('Conversa teste criada.');
    } catch (error) {
      console.error('Falha ao criar conversa teste.', error);
      alert('Não foi possível criar a conversa teste.');
    } finally {
      setCreatingTest(false);
    }
  }

  async function sendReply(textOverride?: string) {
    if (!selectedConversa) { alert('Selecione uma conversa antes de responder.'); return; }
    const outgoingText = (textOverride ?? replyText).trim();
    if (!outgoingText) { alert('Digite uma mensagem antes de enviar.'); return; }

    setSending(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ conversationId: selectedConversa.id, contactId: selectedConversa.contact_id || null, toPhone: selectedConversa.customer_phone, text: outgoingText })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível enviar a mensagem.');
        return;
      }

      setReplyText('');
      await openConversa(selectedConversa);
      await loadInbox();
      alert(result.sent ? 'Mensagem enviada.' : 'Mensagem registrada. O envio real depende do token da Meta.');
    } catch (error) {
      console.error('Falha ao enviar resposta.', error);
      alert('Falha ao enviar resposta.');
    } finally {
      setSending(false);
    }
  }

  useEffect(() => { loadInbox(); }, []);
  useEffect(() => { if (companyId && selectedConversa) openConversa(selectedConversa); }, [companyId, selectedConversa?.id]);

  const filteredConversas = useMemo(() => conversas.filter((conversa) =>
    (statusFilter === 'Todas' || conversa.status === statusFilter) &&
    (priorityFilter === 'Todas' || (conversa.priority || 'Normal') === priorityFilter) &&
    (ownerFilter === 'Todos' || (ownerFilter === 'Sem responsável' ? !conversa.assigned_to : conversa.assigned_to === ownerFilter))
  ), [conversas, statusFilter, priorityFilter, ownerFilter]);

  const queueStats = {
    abertas: conversas.filter((item) => item.status === 'Aberta').length,
    atendimento: conversas.filter((item) => item.status === 'Em atendimento').length,
    resolvidas: conversas.filter((item) => item.status === 'Resolvida').length,
    arquivadas: conversas.filter((item) => item.status === 'Arquivada').length
  };

  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId) || null;
  const selectedFlowSteps = flowSteps.filter((step) => step.flow_id === selectedFlowId).sort((a, b) => a.position - b.position);
  const selectedStep = selectedFlowSteps.find((step) => step.id === selectedStepId) || selectedFlowSteps[0] || null;
  const lastClientMessage = [...mensagens].reverse().find((message) => message.direction === 'inbound')?.body?.toLowerCase() || '';
  const suggestedFlows = flows.filter((flow) => tokenizeTriggers(flow.trigger_phrase).some((trigger) => lastClientMessage.includes(trigger))).slice(0, 3);

  function chooseFlow(flowId: string) {
    setSelectedFlowId(flowId);
    const firstStep = flowSteps.filter((step) => step.flow_id === flowId).sort((a, b) => a.position - b.position)[0];
    setSelectedStepId(firstStep?.id || '');
    if (firstStep?.message) setReplyText(firstStep.message);
  }

  function chooseStep(stepId: string) {
    setSelectedStepId(stepId);
    const step = flowSteps.find((item) => item.id === stepId);
    if (step?.message) setReplyText(step.message);
  }

  return (
    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title"><h2>Fila de atendimento</h2><span>{loading ? 'Carregando...' : `${filteredConversas.length} conversa(s)`}</span></div>
        <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', marginBottom: 12 }}><div className="metric"><span>Abertas</span><strong>{queueStats.abertas}</strong><small>aguardando</small></div><div className="metric"><span>Em atendimento</span><strong>{queueStats.atendimento}</strong><small>em andamento</small></div><div className="metric"><span>Resolvidas</span><strong>{queueStats.resolvidas}</strong><small>finalizadas</small></div><div className="metric"><span>Arquivadas</span><strong>{queueStats.arquivadas}</strong><small>histórico</small></div></div>
        <button className="btn small" onClick={loadInbox}>Atualizar fila</button>
        <div className="form-grid" style={{ marginTop: 12, marginBottom: 12 }}>{filterOptions.map((filter) => <button key={filter} className={statusFilter === filter ? 'btn primary' : 'btn'} onClick={() => setStatusFilter(filter)}>{filter}</button>)}<select className="select" value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}><option>Todos</option><option>Sem responsável</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><select className="select" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option>Todas</option>{priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}</select></div>
        <div className="timeline">{filteredConversas.map((conversa) => (<button className="timeline-item" key={conversa.id} onClick={() => openConversa(conversa)} style={{ textAlign: 'left', width: '100%' }}><b>{conversa.customer_name || 'Cliente sem nome'}</b><br /><span className="notice">{conversa.customer_phone} • {conversa.status} • {conversa.priority || 'Normal'}</span><br /><span className="notice">Responsável: {assigneeName(conversa.assigned_to)} • Última: {formatDate(conversa.last_message_at)}</span></button>))}{!filteredConversas.length && <div className="empty">Nenhuma conversa encontrada para este filtro.</div>}</div>
      </div>

      <div className="card pad">
        <div className="section-title"><h2>{selectedConversa?.customer_name || 'Histórico da conversa'}</h2><span>{selectedConversa?.customer_phone || 'Selecione uma conversa'}</span></div>
        <div className="timeline-item"><b>Gestão da conversa</b><p className="notice">Status: {selectedConversa?.status || '—'} • Prioridade: {selectedConversa?.priority || 'Normal'} • Responsável: {assigneeName(selectedConversa?.assigned_to)}</p></div>
        <div className="form-grid" style={{ marginBottom: 12 }}><select className="select" disabled={!selectedConversa || changingStatus} value={selectedConversa?.status || 'Aberta'} onChange={(event) => updateConversation({ status: event.target.value })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select><select className="select" disabled={!selectedConversa || changingStatus} value={selectedConversa?.priority || 'Normal'} onChange={(event) => updateConversation({ priority: event.target.value })}>{priorityOptions.map((priority) => <option key={priority}>{priority}</option>)}</select><select className="select" disabled={!selectedConversa || changingStatus} value={transferTo} onChange={(event) => setTransferTo(event.target.value)}><option value="">Transferir para...</option>{team.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select><button className="btn" disabled={!selectedConversa || !currentProfile} onClick={() => updateConversation({ assignedTo: currentProfile?.id || null, status: 'Em atendimento' }, 'Atendimento assumido.')}>Assumir</button><button className="btn" disabled={!selectedConversa || !transferTo} onClick={() => updateConversation({ assignedTo: transferTo, status: 'Em atendimento' }, 'Atendimento transferido.')}>Transferir</button><button className="btn success" disabled={!selectedConversa} onClick={() => updateConversation({ status: 'Resolvida' }, 'Conversa resolvida.')}>Resolver</button><button className="btn danger" disabled={!selectedConversa} onClick={() => updateConversation({ status: 'Arquivada' }, 'Conversa arquivada.')}>Arquivar</button><button className="btn small" disabled={!selectedConversa} onClick={() => selectedConversa && openConversa(selectedConversa)}>{loadingMessages ? 'Carregando...' : 'Atualizar conversa'}</button></div>

        <div className="timeline">{mensagens.map((mensagem) => (<div className="timeline-item" key={mensagem.id}><b>{mensagem.direction === 'inbound' ? 'Cliente' : 'Equipe'}</b><p>{mensagem.body || 'Mensagem sem texto'}</p><span className="notice">{mensagem.status} • {formatDate(mensagem.created_at)}</span></div>))}{!mensagens.length && <div className="empty">Nenhuma mensagem nesta conversa ainda.</div>}</div>

        <div className="card pad" style={{ marginTop: 16 }}>
          <div className="section-title"><h2>Fluxo sugerido</h2><span>{suggestedFlows.length ? 'por gatilho' : 'manual'}</span></div>
          <p className="notice">Use jornadas salvas em Configurações para responder mais rápido sem perder o atendimento humano.</p>
          {!!suggestedFlows.length && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>{suggestedFlows.map((flow) => <button key={flow.id} className="btn small success" onClick={() => chooseFlow(flow.id)}>{flow.name}</button>)}</div>}
          <div className="form-grid">
            <select className="select" value={selectedFlowId} onChange={(event) => chooseFlow(event.target.value)}><option value="">Selecionar fluxo...</option>{flows.map((flow) => <option key={flow.id} value={flow.id}>{flow.name}</option>)}</select>
            <select className="select" value={selectedStepId} onChange={(event) => chooseStep(event.target.value)} disabled={!selectedFlowId}><option value="">Selecionar passo...</option>{selectedFlowSteps.map((step) => <option key={step.id} value={step.id}>Passo {step.position} • {step.step_type} • {step.delay_minutes}min</option>)}</select>
            <button className="btn" disabled={!selectedStep} onClick={() => selectedStep?.message && setReplyText(selectedStep.message)}>Inserir passo</button>
            <button className="btn primary" disabled={!selectedConversa || !selectedStep || sending} onClick={() => selectedStep?.message && sendReply(selectedStep.message)}>{sending ? 'Enviando...' : 'Enviar passo'}</button>
          </div>
          {selectedFlow && <p className="notice" style={{ marginTop: 10 }}>Fluxo: {selectedFlow.name} • {selectedFlow.objective || 'Sem objetivo cadastrado.'}</p>}
        </div>

        <div className="form-grid" style={{ marginTop: 16 }}><select className="select full" onChange={(event) => setReplyText(event.target.value)} defaultValue=""><option value="">Inserir mensagem rápida...</option>{quickMessages.map((message) => <option key={message.dbId || message.id} value={message.text}>{message.title} • {message.category}</option>)}</select><textarea className="input full" placeholder="Digite sua resposta..." value={replyText} onChange={(event) => setReplyText(event.target.value)} style={{ minHeight: 90 }} /><button className="btn primary full" disabled={!selectedConversa || sending} onClick={() => sendReply()}>{sending ? 'Enviando...' : 'Enviar resposta'}</button><p className="notice full">Sem token da Meta, a resposta fica registrada como fila/rascunho no CRM. Com token ativo, o envio será feito pela API oficial.</p></div>
        <div className="card pad" style={{ marginTop: 16 }}><div className="section-title"><h2>Teste manual</h2><span>Validação sem Meta</span></div><div className="form-grid"><input className="input" value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="Nome do cliente" /><input className="input" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="Telefone" /><textarea className="input full" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Mensagem recebida" style={{ minHeight: 80 }} /><button className="btn full" disabled={creatingTest} onClick={createTestConversation}>{creatingTest ? 'Criando...' : 'Criar conversa teste'}</button></div></div>
      </div>
    </div>
  );
}
