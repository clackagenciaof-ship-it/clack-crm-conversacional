"use client";

import { useEffect, useState } from 'react';
import { getCurrentProfile, listWhatsAppConversations, listWhatsAppMessages } from '@/lib/supabase/crm-repository';

type Conversa = {
  id: string;
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

export function AtendimentoPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [selectedConversa, setSelectedConversa] = useState<Conversa | null>(null);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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
      </div>
    </div>
  );
}
