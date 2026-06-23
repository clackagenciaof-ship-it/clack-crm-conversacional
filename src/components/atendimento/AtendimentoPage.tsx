"use client";

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile, listWhatsAppConversations, listWhatsAppMessages } from '@/lib/supabase/crm-repository';

type Conversa = {
  id: string;
  contact_id?: string | null;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  last_message_at: string | null;
};

type Mensagem = {
  id: string;
  direction: string;
  body: string | null;
  status: string;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

export function AtendimentoPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
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

  async function loadInbox() {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      if (!profile?.company_id) return;
      setCompanyId(profile.company_id);
      const data = await listWhatsAppConversations(profile.company_id);
      const nextConversas = data as Conversa[];
      setConversas(nextConversas);
      if (!selectedConversa && nextConversas[0]) {
        setSelectedConversa(nextConversas[0]);
      }
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

  async function createTestConversation() {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) {
      alert('Supabase não configurado neste ambiente.');
      return;
    }

    const profile = await getCurrentProfile();
    if (!profile?.company_id) {
      alert('Usuário sem empresa vinculada.');
      return;
    }

    const phone = normalizePhone(testPhone);
    if (!phone || !testMessage.trim()) {
      alert('Informe telefone e mensagem de teste.');
      return;
    }

    setCreatingTest(true);
    try {
      const now = new Date().toISOString();
      const { data: conversa, error: conversaError } = await supabase
        .from('whatsapp_conversations')
        .insert({
          company_id: profile.company_id,
          customer_phone: phone,
          customer_name: testName.trim() || 'Cliente Teste',
          status: 'Aberta',
          last_message_at: now
        })
        .select('*')
        .single();

      if (conversaError) throw conversaError;

      const { error: messageError } = await supabase
        .from('whatsapp_messages')
        .insert({
          company_id: profile.company_id,
          conversation_id: conversa.id,
          direction: 'inbound',
          from_phone: phone,
          to_phone: 'CRM',
          message_type: 'text',
          body: testMessage.trim(),
          status: 'received',
          raw_payload: { source: 'manual_test' },
          created_at: now
        });

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

  async function sendReply() {
    if (!companyId || !selectedConversa) {
      alert('Selecione uma conversa antes de responder.');
      return;
    }

    if (!replyText.trim()) {
      alert('Digite uma mensagem antes de enviar.');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          conversationId: selectedConversa.id,
          contactId: selectedConversa.contact_id || null,
          toPhone: selectedConversa.customer_phone,
          text: replyText
        })
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

  useEffect(() => {
    loadInbox();
  }, []);

  useEffect(() => {
    if (companyId && selectedConversa) {
      openConversa(selectedConversa);
    }
  }, [companyId, selectedConversa?.id]);

  return (
    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title">
          <h2>Conversas recebidas</h2>
          <span>{loading ? 'Carregando...' : `${conversas.length} conversa(s)`}</span>
        </div>
        <button className="btn small" onClick={loadInbox}>Atualizar</button>
        <div className="timeline">
          {conversas.map((conversa) => (
            <button className="timeline-item" key={conversa.id} onClick={() => openConversa(conversa)} style={{ textAlign: 'left', width: '100%' }}>
              <b>{conversa.customer_name || 'Cliente sem nome'}</b>
              <br />
              <span className="notice">{conversa.customer_phone} • {conversa.status}</span>
              <br />
              <span className="notice">Última mensagem: {formatDate(conversa.last_message_at)}</span>
            </button>
          ))}
          {!conversas.length && <div className="empty">Nenhuma conversa recebida ainda.</div>}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>{selectedConversa?.customer_name || 'Histórico da conversa'}</h2>
          <span>{selectedConversa?.customer_phone || 'Selecione uma conversa'}</span>
        </div>
        <button className="btn small" disabled={!selectedConversa} onClick={() => selectedConversa && openConversa(selectedConversa)}>
          {loadingMessages ? 'Carregando...' : 'Atualizar conversa'}
        </button>
        <div className="timeline">
          {mensagens.map((mensagem) => (
            <div className="timeline-item" key={mensagem.id}>
              <b>{mensagem.direction === 'inbound' ? 'Cliente' : 'Equipe'}</b>
              <p>{mensagem.body || 'Mensagem sem texto'}</p>
              <span className="notice">{mensagem.status} • {formatDate(mensagem.created_at)}</span>
            </div>
          ))}
          {!mensagens.length && <div className="empty">Nenhuma mensagem nesta conversa ainda.</div>}
        </div>

        <div className="form-grid" style={{ marginTop: 16 }}>
          <textarea className="input full" placeholder="Digite sua resposta..." value={replyText} onChange={(event) => setReplyText(event.target.value)} style={{ minHeight: 90 }} />
          <button className="btn primary full" disabled={!selectedConversa || sending} onClick={sendReply}>
            {sending ? 'Enviando...' : 'Enviar resposta'}
          </button>
          <p className="notice full">Sem token da Meta, a resposta fica registrada como fila/rascunho no CRM. Com token ativo, o envio será feito pela API oficial.</p>
        </div>

        <div className="card pad" style={{ marginTop: 16 }}>
          <div className="section-title">
            <h2>Teste manual</h2>
            <span>Validação sem Meta</span>
          </div>
          <div className="form-grid">
            <input className="input" value={testName} onChange={(event) => setTestName(event.target.value)} placeholder="Nome do cliente" />
            <input className="input" value={testPhone} onChange={(event) => setTestPhone(event.target.value)} placeholder="Telefone" />
            <textarea className="input full" value={testMessage} onChange={(event) => setTestMessage(event.target.value)} placeholder="Mensagem recebida" style={{ minHeight: 80 }} />
            <button className="btn full" disabled={creatingTest} onClick={createTestConversation}>
              {creatingTest ? 'Criando...' : 'Criar conversa teste'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
