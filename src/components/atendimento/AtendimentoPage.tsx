"use client";

import { useEffect, useState } from 'react';
import { getCurrentProfile, listWhatsAppConversations } from '@/lib/supabase/crm-repository';

type Conversa = {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  last_message_at: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function AtendimentoPage() {
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadInbox() {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      if (!profile?.company_id) return;
      const data = await listWhatsAppConversations(profile.company_id);
      setConversas(data as Conversa[]);
    } catch (error) {
      console.error('Falha ao carregar atendimento.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInbox();
  }, []);

  return (
    <div className="card pad">
      <div className="section-title">
        <h2>Conversas recebidas</h2>
        <span>{loading ? 'Carregando...' : `${conversas.length} conversa(s)`}</span>
      </div>
      <button className="btn small" onClick={loadInbox}>Atualizar</button>
      <div className="timeline">
        {conversas.map((conversa) => (
          <div className="timeline-item" key={conversa.id}>
            <b>{conversa.customer_name || 'Cliente sem nome'}</b>
            <br />
            <span className="notice">{conversa.customer_phone} • {conversa.status}</span>
            <br />
            <span className="notice">Última mensagem: {formatDate(conversa.last_message_at)}</span>
          </div>
        ))}
        {!conversas.length && <div className="empty">Nenhuma conversa recebida ainda.</div>}
      </div>
    </div>
  );
}
