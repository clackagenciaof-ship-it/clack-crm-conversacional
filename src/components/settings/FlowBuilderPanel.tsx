"use client";

import { useEffect, useMemo, useState } from 'react';
import { loadChatbotFlows, saveChatbotFlow, type ChatbotFlow, type ChatbotFlowStep, type FlowForm } from '@/lib/crm/flow-admin';

const flowTemplates = [
  {
    name: 'Boas-vindas comercial',
    objective: 'Receber, qualificar e direcionar o lead para atendimento humano.',
    trigger_phrase: 'oi, olá, quero atendimento, quero saber mais',
    steps: [
      { position: 1, step_type: 'message', message: 'Olá! Seja bem-vindo(a). Recebemos seu contato e já vamos te ajudar.', delay_minutes: 0 },
      { position: 2, step_type: 'message', message: 'Para agilizar, me diga seu nome, cidade e qual solução você procura.', delay_minutes: 1 },
      { position: 3, step_type: 'handoff', message: 'Perfeito. Vou direcionar seu atendimento para um especialista da equipe.', delay_minutes: 2 }
    ]
  },
  {
    name: 'Recuperação de proposta',
    objective: 'Retomar leads que receberam proposta e ainda não decidiram.',
    trigger_phrase: 'proposta, orçamento, valor, preço',
    steps: [
      { position: 1, step_type: 'message', message: 'Passando para saber se ficou alguma dúvida sobre a proposta enviada.', delay_minutes: 0 },
      { position: 2, step_type: 'message', message: 'Posso te ajudar a escolher a melhor opção para começar ainda hoje?', delay_minutes: 60 },
      { position: 3, step_type: 'handoff', message: 'Vou chamar um consultor para finalizar com você.', delay_minutes: 120 }
    ]
  },
  {
    name: 'Pós-venda e indicação',
    objective: 'Acompanhar cliente fechado e estimular indicação.',
    trigger_phrase: 'fechado, cliente, pós-venda',
    steps: [
      { position: 1, step_type: 'message', message: 'Tudo certo com sua contratação? Estamos acompanhando para garantir uma ótima experiência.', delay_minutes: 0 },
      { position: 2, step_type: 'message', message: 'Conhece alguém que também precisa dessa solução? Podemos atender com prioridade.', delay_minutes: 1440 },
      { position: 3, step_type: 'task', message: 'Criar tarefa de pós-venda e pedido de indicação.', delay_minutes: 1440 }
    ]
  }
];

const emptyForm: FlowForm = {
  name: '',
  channel: 'WhatsApp',
  objective: '',
  trigger_phrase: '',
  status: 'active',
  active: true,
  steps: [
    { position: 1, step_type: 'message', message: '', delay_minutes: 0 },
    { position: 2, step_type: 'message', message: '', delay_minutes: 1 },
    { position: 3, step_type: 'handoff', message: '', delay_minutes: 2 }
  ]
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function FlowBuilderPanel() {
  const [flows, setFlows] = useState<ChatbotFlow[]>([]);
  const [steps, setSteps] = useState<ChatbotFlowStep[]>([]);
  const [form, setForm] = useState<FlowForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadChatbotFlows();
      setFlows(data.flows);
      setSteps(data.steps);
    } catch (error) {
      console.error('Falha ao carregar fluxos.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const activeFlows = useMemo(() => flows.filter((flow) => flow.active), [flows]);

  function useTemplate(template: typeof flowTemplates[number]) {
    setForm({ ...emptyForm, ...template, status: 'active', active: true, channel: 'WhatsApp' });
  }

  function editFlow(flow: ChatbotFlow) {
    const flowSteps = steps.filter((step) => step.flow_id === flow.id).sort((a, b) => a.position - b.position);
    setForm({
      id: flow.id,
      name: flow.name,
      channel: flow.channel,
      objective: flow.objective || '',
      trigger_phrase: flow.trigger_phrase || '',
      status: flow.status,
      active: flow.active,
      steps: flowSteps.length ? flowSteps.map((step) => ({ position: step.position, step_type: step.step_type, message: step.message, delay_minutes: step.delay_minutes })) : emptyForm.steps
    });
  }

  function updateStep(index: number, field: 'message' | 'step_type' | 'delay_minutes', value: string | number) {
    setForm((current) => ({
      ...current,
      steps: current.steps.map((step, stepIndex) => stepIndex === index ? { ...step, [field]: field === 'delay_minutes' ? Number(value) : String(value) } : step)
    }));
  }

  async function submitFlow() {
    if (!form.name.trim()) { alert('Informe o nome do fluxo.'); return; }
    if (!form.steps.some((step) => step.message.trim())) { alert('Informe ao menos uma mensagem no fluxo.'); return; }
    setSaving(true);
    try {
      await saveChatbotFlow(form);
      setForm(emptyForm);
      await refresh();
      alert('Fluxo automático salvo.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar o fluxo.';
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card pad" style={{ overflow: 'hidden' }}>
      <div className="section-title" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Fluxos automáticos e chatbot</h2>
          <p className="notice" style={{ marginTop: 6 }}>Fase 10.2: construa jornadas de mensagens para boas-vindas, proposta, pós-venda e atendimento.</p>
        </div>
        <span>{loading ? 'Carregando...' : `${activeFlows.length} ativo(s)`}</span>
      </div>

      <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 16 }}>
        <div className="metric"><span>Fluxos criados</span><strong>{flows.length}</strong><small>chatbot</small></div>
        <div className="metric"><span>Etapas de mensagem</span><strong>{steps.length}</strong><small>passos</small></div>
        <div className="metric"><span>Canal inicial</span><strong>WhatsApp</strong><small>QR/API Meta depois</small></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .9fr) minmax(320px, 1.1fr)', gap: 18, marginTop: 18 }}>
        <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(180deg, #ffffff 0%, #f8ffff 100%)' }}>
          <div className="section-title"><b>{form.id ? 'Editar fluxo' : 'Criar fluxo'}</b><span>{form.channel}</span></div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <input className="input full" placeholder="Nome do fluxo" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input className="input full" placeholder="Palavras gatilho" value={form.trigger_phrase} onChange={(event) => setForm({ ...form, trigger_phrase: event.target.value })} />
            <textarea className="input full" placeholder="Objetivo do fluxo" value={form.objective} onChange={(event) => setForm({ ...form, objective: event.target.value })} style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {form.steps.map((step, index) => (
              <div className="timeline-item" key={index} style={{ margin: 0 }}>
                <div className="section-title"><b>Passo {index + 1}</b><span>{step.delay_minutes} min</span></div>
                <div className="form-grid">
                  <select className="select" value={step.step_type} onChange={(event) => updateStep(index, 'step_type', event.target.value)}><option value="message">Mensagem</option><option value="task">Criar tarefa</option><option value="handoff">Passar para humano</option></select>
                  <input className="input" type="number" value={step.delay_minutes} onChange={(event) => updateStep(index, 'delay_minutes', Number(event.target.value || 0))} />
                  <textarea className="input full" placeholder="Mensagem do passo" value={step.message} onChange={(event) => updateStep(index, 'message', event.target.value)} style={{ minHeight: 70 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}><button className="btn primary" disabled={saving} onClick={submitFlow}>{saving ? 'Salvando...' : form.id ? 'Salvar fluxo' : 'Criar fluxo'}</button><button className="btn" onClick={() => setForm(emptyForm)}>Limpar</button></div>
        </div>

        <div>
          <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(135deg, #005954 0%, #338b85 48%, #5dc1b9 100%)', color: '#ffffff', borderLeft: 'none' }}>
            <b style={{ color: '#ffffff' }}>Modelos prontos para vender mais</b>
            <p style={{ color: 'rgba(255,255,255,.84)', marginTop: 8 }}>Use como ponto de partida. Depois a conexão QR Code/API Meta fará o envio real.</p>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>{flowTemplates.map((template) => <button className="btn" key={template.name} onClick={() => useTemplate(template)} style={{ textAlign: 'left' }}><b>{template.name}</b><br /><small>{template.objective}</small></button>)}</div>
          </div>
          <div className="timeline-item" style={{ marginTop: 14 }}>
            <b>Funcionalidades na régua</b>
            <p className="notice">Base pronta para IA integrada, GPT especialista, chatbot, disparos segmentados, suporte humano, QR Code e API oficial Meta.</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 18 }}>
        {flows.map((flow) => {
          const count = steps.filter((step) => step.flow_id === flow.id).length;
          return <div className="timeline-item" key={flow.id} style={{ margin: 0 }}><div className="section-title"><b>{flow.name}</b><span>{flow.status}</span></div><p className="notice">{flow.objective || 'Sem objetivo informado.'}</p><p className="notice">Gatilhos: {flow.trigger_phrase || 'não informado'} • {count} passo(s)</p><button className="btn small" onClick={() => editFlow(flow)}>Editar fluxo</button><small style={{ display: 'block', marginTop: 10 }}>{formatDate(flow.created_at)}</small></div>;
        })}
        {!flows.length && <div className="empty">Nenhum fluxo automático criado.</div>}
      </div>
    </div>
  );
}
