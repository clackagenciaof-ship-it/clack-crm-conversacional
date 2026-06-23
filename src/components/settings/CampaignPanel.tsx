"use client";

import { useEffect, useState } from 'react';
import { createCampaign, loadCampaigns, type CampaignForm, type MessageCampaign } from '@/lib/crm/campaign-admin';

const segmentOptions = [
  { value: 'lead_quente', label: 'Leads quentes', description: 'Contatos com maior intenção de compra.' },
  { value: 'lead_morno', label: 'Leads mornos', description: 'Contatos que precisam de nutrição.' },
  { value: 'lead_frio', label: 'Leads frios', description: 'Base para reativação cuidadosa.' },
  { value: 'propostas_enviadas', label: 'Propostas enviadas', description: 'Oportunidades abertas na etapa Proposta Enviada.' },
  { value: 'todos_leads', label: 'Todos os leads', description: 'Base geral da empresa, sem arquivados.' }
];

const templates = [
  { name: 'Retomada de proposta', segment_type: 'propostas_enviadas', message: 'Olá! Passando para saber se ficou alguma dúvida sobre a proposta enviada. Posso te ajudar a avançar hoje?' },
  { name: 'Lead quente prioritário', segment_type: 'lead_quente', message: 'Olá! Vi seu interesse e quero te ajudar com prioridade. Qual melhor horário para conversarmos?' },
  { name: 'Reativação comercial', segment_type: 'lead_morno', message: 'Olá! Tudo bem? Temos uma condição especial e posso te mostrar uma solução melhor para sua necessidade.' }
];

const emptyForm: CampaignForm = { name: '', segment_type: 'lead_quente', message: '' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function segmentLabel(value: string) {
  return segmentOptions.find((option) => option.value === value)?.label || value;
}

export function CampaignPanel() {
  const [campaigns, setCampaigns] = useState<MessageCampaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setCampaigns(await loadCampaigns()); } catch (error) { console.error('Falha ao carregar disparos.', error); } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  async function submitCampaign() {
    if (!form.name.trim() || !form.message.trim()) { alert('Informe nome e mensagem do disparo.'); return; }
    setSaving(true);
    try {
      const campaign = await createCampaign(form);
      setCampaigns((current) => [campaign, ...current]);
      setForm(emptyForm);
      alert(`Disparo preparado com ${campaign.total_recipients} destinatário(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível preparar disparo.';
      alert(message);
    } finally { setSaving(false); }
  }

  return (
    <div className="card pad" style={{ overflow: 'hidden' }}>
      <div className="section-title" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Disparos segmentados</h2>
          <p className="notice" style={{ marginTop: 6 }}>Fase 10.5: prepare campanhas com segmentação. O envio real fica condicionado à API oficial Meta e às regras de opt-in.</p>
        </div>
        <span>{loading ? 'Carregando...' : `${campaigns.length} campanha(s)`}</span>
      </div>

      <div className="grid two-col" style={{ marginTop: 16 }}>
        <div className="timeline-item" style={{ margin: 0 }}>
          <div className="section-title"><b>Preparar disparo</b><span>fila segura</span></div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <input className="input full" placeholder="Nome da campanha" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <select className="select full" value={form.segment_type} onChange={(event) => setForm({ ...form, segment_type: event.target.value })}>{segmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
            <textarea className="input full" placeholder="Mensagem do disparo" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} style={{ minHeight: 110 }} />
            <button className="btn primary full" disabled={saving} onClick={submitCampaign}>{saving ? 'Preparando...' : 'Preparar disparo'}</button>
          </div>
        </div>

        <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(135deg, #005954 0%, #338b85 48%, #5dc1b9 100%)', color: '#ffffff', borderLeft: 'none' }}>
          <b style={{ color: '#ffffff' }}>Segmentos e modelos</b>
          <p style={{ color: 'rgba(255,255,255,.84)', marginTop: 8 }}>Use disparos com estratégia comercial, evitando spam. A base entra em fila para revisão e envio oficial.</p>
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>{templates.map((template) => <button className="btn" key={template.name} onClick={() => setForm(template)} style={{ textAlign: 'left' }}><b>{template.name}</b><br /><small>{segmentLabel(template.segment_type)}</small></button>)}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
        {segmentOptions.map((segment) => <div className="metric" key={segment.value}><span>{segment.label}</span><strong>{campaigns.filter((campaign) => campaign.segment_type === segment.value).length}</strong><small>{segment.description}</small></div>)}
      </div>

      <div className="timeline" style={{ marginTop: 16 }}>
        {campaigns.map((campaign) => <div className="timeline-item" key={campaign.id}><div className="section-title"><b>{campaign.name}</b><span>{campaign.status}</span></div><p className="notice">{segmentLabel(campaign.segment_type)} • {campaign.total_recipients} destinatário(s) • {formatDate(campaign.created_at)}</p><p>{campaign.message}</p></div>)}
        {!campaigns.length && <div className="empty">Nenhum disparo preparado ainda.</div>}
      </div>
    </div>
  );
}
