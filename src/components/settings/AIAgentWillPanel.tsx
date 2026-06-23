"use client";

import { useEffect, useState } from 'react';
import { defaultAgentSettings, loadAIAgent, saveAIAgent, suggestWithAIAgent, type AIAgentLog, type AIAgentSettings } from '@/lib/crm/ai-agent-client';

const tonePresets = [
  'Consultivo, humano, objetivo e comercial',
  'Persuasivo, direto, seguro e orientado para fechamento',
  'Acolhedor, paciente, claro e focado em atendimento',
  'Executivo, premium, estratégico e com linguagem de decisão',
  'Jovem, próximo, leve e com energia de marca digital'
];

const specialtyPresets = [
  'Vendas, atendimento, follow-up, recuperação de proposta e gestão comercial',
  'Qualificação de leads, diagnóstico de necessidade e encaminhamento para vendedor',
  'Recuperação de orçamento, objeções de preço e retomada de negociação',
  'Pós-venda, retenção, recompra, indicação e relacionamento com cliente',
  'Suporte comercial, triagem de atendimento e passagem para equipe humana'
];

const knowledgePresets = [
  'Empresa de serviços: destacar diagnóstico, proposta personalizada, prazo, garantia, atendimento humano e acompanhamento pelo CRM.',
  'Varejo e loja: destacar produtos disponíveis, condições, urgência, benefícios, prova social e chamada para compra.',
  'Telecom/provedor: destacar planos, cobertura, instalação, suporte, estabilidade, atendimento rápido e retenção.',
  'Consultoria/marketing: destacar diagnóstico, funil, campanhas, indicadores, posicionamento, vendas e crescimento de receita.',
  'Saúde/estética/agenda: destacar segurança, avaliação, horários disponíveis, orientação, confirmação e experiência do cliente.'
];

export function AIAgentWillPanel() {
  const [settings, setSettings] = useState<AIAgentSettings>(defaultAgentSettings);
  const [logs, setLogs] = useState<AIAgentLog[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [customerMessage, setCustomerMessage] = useState('Olá, quero saber valores e como funciona.');
  const [goal, setGoal] = useState('Converter lead em oportunidade qualificada');
  const [suggestion, setSuggestion] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function refresh() {
    try {
      const data = await loadAIAgent();
      setSettings({ ...defaultAgentSettings, ...data.settings });
      setLogs(data.logs);
      setCanManage(data.canManage);
    } catch {
      setSettings(defaultAgentSettings);
    }
  }

  useEffect(() => { refresh(); }, []);

  function update(field: keyof AIAgentSettings, value: string | boolean) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      const saved = await saveAIAgent(settings);
      setSettings({ ...defaultAgentSettings, ...saved });
      alert('Agente Will configurado.');
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar IA.');
    } finally {
      setSaving(false);
    }
  }

  async function generateSuggestion() {
    setGenerating(true);
    try {
      const text = await suggestWithAIAgent({ context: `${settings.specialty}\n${settings.knowledge_base || ''}`, customer_message: customerMessage, goal });
      setSuggestion(text);
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível gerar sugestão.');
    } finally {
      setGenerating(false);
    }
  }

  async function copySuggestion() {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    alert('Sugestão copiada. Use na Central de Atendimento ou nas mensagens rápidas.');
  }

  return <div className="card pad">
    <div className="section-title"><div><h2>IA Agente Will</h2><p className="notice">Especialista comercial para sugerir respostas, próximos passos, produtos e follow-ups.</p></div><span>Fase 15</span></div>
    <div className="grid two-col" style={{ marginTop: 0 }}>
      <div>
        <div className="form-grid">
          <input className="input" disabled={!canManage} value={settings.agent_name} onChange={(event) => update('agent_name', event.target.value)} placeholder="Nome do agente" />
          <select className="select" disabled={!canManage} value={settings.enabled ? 'Ativo' : 'Inativo'} onChange={(event) => update('enabled', event.target.value === 'Ativo')}><option>Ativo</option><option>Inativo</option></select>
          <select className="select full" disabled={!canManage} value={settings.tone} onChange={(event) => update('tone', event.target.value)}><option value="">Selecionar tom de voz...</option>{tonePresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select>
          <input className="input full" disabled={!canManage} value={settings.tone} onChange={(event) => update('tone', event.target.value)} placeholder="Tom personalizado" />
          <select className="select full" disabled={!canManage} value={settings.specialty} onChange={(event) => update('specialty', event.target.value)}><option value="">Selecionar especialidade...</option>{specialtyPresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select>
          <input className="input full" disabled={!canManage} value={settings.specialty} onChange={(event) => update('specialty', event.target.value)} placeholder="Especialidade personalizada" />
          <textarea className="textarea full" disabled={!canManage} value={settings.instructions} onChange={(event) => update('instructions', event.target.value)} placeholder="Instruções comerciais" />
          <select className="select full" disabled={!canManage} value={settings.knowledge_base || ''} onChange={(event) => update('knowledge_base', event.target.value)}><option value="">Selecionar base de conhecimento...</option>{knowledgePresets.map((preset) => <option key={preset} value={preset}>{preset}</option>)}</select>
          <textarea className="textarea full" disabled={!canManage} value={settings.knowledge_base || ''} onChange={(event) => update('knowledge_base', event.target.value)} placeholder="Base de conhecimento personalizada: diferenciais, serviços, objeções, garantias" />
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginTop: 14 }}>
          <button className={settings.auto_suggest ? 'btn success' : 'btn'} disabled={!canManage} onClick={() => update('auto_suggest', !settings.auto_suggest)}>Sugestão automática</button>
          <button className={settings.can_create_tasks ? 'btn success' : 'btn'} disabled={!canManage} onClick={() => update('can_create_tasks', !settings.can_create_tasks)}>Criar tarefas</button>
          <button className={settings.can_suggest_products ? 'btn success' : 'btn'} disabled={!canManage} onClick={() => update('can_suggest_products', !settings.can_suggest_products)}>Sugerir produtos</button>
          <button className={settings.can_suggest_messages ? 'btn success' : 'btn'} disabled={!canManage} onClick={() => update('can_suggest_messages', !settings.can_suggest_messages)}>Sugerir mensagens</button>
        </div>
        {canManage && <button className="btn primary" style={{ marginTop: 14, width: '100%' }} disabled={saving} onClick={submit}>{saving ? 'Salvando...' : 'Salvar IA Agente Will'}</button>}
      </div>
      <div>
        <div className="timeline-item"><b>Laboratório de resposta</b><p className="notice">Gere uma resposta comercial segura antes de conectar GPT/API oficial.</p></div>
        <div className="form-grid" style={{ marginTop: 12 }}>
          <input className="input full" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Objetivo interno" />
          <textarea className="textarea full" value={customerMessage} onChange={(event) => setCustomerMessage(event.target.value)} placeholder="Mensagem do cliente" />
          <button className="btn primary" disabled={generating} onClick={generateSuggestion}>{generating ? 'Gerando...' : 'Gerar sugestão'}</button>
          <button className="btn" onClick={copySuggestion}>Copiar resposta</button>
        </div>
        {suggestion && <div className="message-card" style={{ marginTop: 12, whiteSpace: 'pre-line' }}><strong>{settings.agent_name}</strong><p>{suggestion}</p></div>}
        <div className="timeline" style={{ marginTop: 12 }}>
          {logs.slice(0, 3).map((log) => <div className="timeline-item" key={log.id}><b>{log.action_type}</b><p className="notice">{new Date(log.created_at).toLocaleString('pt-BR')}</p></div>)}
        </div>
      </div>
    </div>
  </div>;
}
