"use client";

import { useEffect, useMemo, useState } from 'react';
import { loadAutomations, runAutomationsNow, saveAutomationRule, toggleAutomationRule, type AutomationForm, type AutomationRule, type AutomationRun } from '@/lib/crm/automation-admin';

const emptyForm: AutomationForm = {
  name: '',
  description: '',
  trigger_type: 'lead_hot_idle',
  action_type: 'create_task',
  stage_name: 'Proposta Enviada',
  delay_minutes: 60,
  message: 'Fazer follow-up e registrar retorno no CRM.',
  active: true,
  config: { priority: 'Alta', task_type: 'Follow-up' }
};

const triggers = [
  { value: 'lead_hot_idle', label: 'Lead quente parado', description: 'Cria follow-up automático para leads quentes sem avanço.' },
  { value: 'opportunity_stage_idle', label: 'Oportunidade parada por etapa', description: 'Cria tarefa quando uma oportunidade está em uma etapa estratégica.' },
  { value: 'conversation_open', label: 'Conversa aberta sem fechamento', description: 'Cria ação para atendimento aberto ou em andamento.' }
];

const priorities = ['Alta', 'Média', 'Baixa'];

function triggerLabel(value: string) {
  return triggers.find((trigger) => trigger.value === value)?.label || value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function AutomationPanel() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRun[]>([]);
  const [form, setForm] = useState<AutomationForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const data = await loadAutomations();
      setRules(data.rules);
      setRuns(data.runs);
    } catch (error) {
      console.error('Falha ao carregar automações.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const activeRules = useMemo(() => rules.filter((rule) => rule.active), [rules]);
  const rulesByTrigger = useMemo(() => triggers.map((trigger) => ({ ...trigger, count: rules.filter((rule) => rule.trigger_type === trigger.value).length })), [rules]);

  function startEdit(rule: AutomationRule) {
    setForm({
      id: rule.id,
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      stage_name: rule.stage_name || 'Proposta Enviada',
      delay_minutes: Number(rule.delay_minutes || 0),
      message: rule.message || '',
      active: rule.active,
      config: rule.config || { priority: 'Média', task_type: 'Automação' }
    });
  }

  async function submitRule() {
    if (!form.name.trim()) { alert('Informe o nome da automação.'); return; }
    setSaving(true);
    try {
      await saveAutomationRule(form);
      setForm(emptyForm);
      await refresh();
      alert('Automação salva.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível salvar automação.';
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleRule(rule: AutomationRule) {
    try {
      await toggleAutomationRule(rule.id, !rule.active);
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar automação.';
      alert(message);
    }
  }

  async function runNow() {
    setRunning(true);
    try {
      const result = await runAutomationsNow();
      await refresh();
      alert(`Automações executadas. Criadas: ${result.executed}. Ignoradas por repetição: ${result.skipped}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível executar automações.';
      alert(message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card pad" style={{ overflow: 'hidden' }}>
      <div className="section-title" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Automações comerciais</h2>
          <p className="notice" style={{ marginTop: 6 }}>Crie rotinas para vender mais, organizar atendimento e não perder follow-up.</p>
        </div>
        <span>{loading ? 'Carregando...' : `${activeRules.length} ativa(s)`}</span>
      </div>

      <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 16 }}>
        <div className="metric"><span>Regras criadas</span><strong>{rules.length}</strong><small>automações</small></div>
        <div className="metric"><span>Ativas</span><strong>{activeRules.length}</strong><small>em operação</small></div>
        <div className="metric"><span>Execuções recentes</span><strong>{runs.length}</strong><small>histórico</small></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .9fr) minmax(320px, 1.1fr)', gap: 18, marginTop: 18 }}>
        <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(180deg, #ffffff 0%, #f8ffff 100%)' }}>
          <div className="section-title"><b>{form.id ? 'Editar automação' : 'Criar automação'}</b><span>{form.active ? 'Ativa' : 'Inativa'}</span></div>
          <p className="notice">Comece com regras simples: gerar tarefa, puxar atendimento, retomar proposta e priorizar lead quente.</p>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <input className="input full" placeholder="Nome da automação" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <select className="select full" value={form.trigger_type} onChange={(event) => setForm({ ...form, trigger_type: event.target.value })}>{triggers.map((trigger) => <option key={trigger.value} value={trigger.value}>{trigger.label}</option>)}</select>
            <input className="input" placeholder="Etapa, ex: Proposta Enviada" value={form.stage_name} onChange={(event) => setForm({ ...form, stage_name: event.target.value })} />
            <input className="input" type="number" placeholder="Delay em minutos" value={form.delay_minutes} onChange={(event) => setForm({ ...form, delay_minutes: Number(event.target.value || 0) })} />
            <select className="select" value={String(form.config.priority || 'Média')} onChange={(event) => setForm({ ...form, config: { ...form.config, priority: event.target.value } })}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select>
            <input className="input" placeholder="Tipo da tarefa" value={String(form.config.task_type || 'Automação')} onChange={(event) => setForm({ ...form, config: { ...form.config, task_type: event.target.value } })} />
            <textarea className="input full" placeholder="Mensagem / orientação da tarefa" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} style={{ minHeight: 86 }} />
            <textarea className="input full" placeholder="Descrição interna" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} style={{ minHeight: 70 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}><button className="btn primary" disabled={saving} onClick={submitRule}>{saving ? 'Salvando...' : form.id ? 'Salvar automação' : 'Criar automação'}</button><button className="btn" onClick={() => setForm(emptyForm)}>Limpar</button></div>
        </div>

        <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(135deg, #005954 0%, #338b85 48%, #5dc1b9 100%)', color: '#ffffff', borderLeft: 'none' }}>
          <b style={{ color: '#ffffff' }}>Central de automações</b>
          <p style={{ color: 'rgba(255,255,255,.84)', marginTop: 8 }}>O motor cria tarefas automáticas e registra execuções. A próxima evolução conecta chatbot, disparos, QR Code, IA e API Meta.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 18 }}>{rulesByTrigger.map((item) => <div key={item.value} style={{ background: 'rgba(255,255,255,.96)', borderRadius: 18, padding: 14, color: '#053f3b' }}><small>{item.label}</small><strong style={{ display: 'block', marginTop: 8 }}>{item.count}</strong><span className="notice">regra(s)</span></div>)}</div>
          <button className="btn" style={{ marginTop: 18, width: '100%' }} disabled={running} onClick={runNow}>{running ? 'Executando...' : 'Executar automações agora'}</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, marginTop: 18 }}>
        {rules.map((rule) => <div className="timeline-item" key={rule.id} style={{ margin: 0, borderLeftColor: rule.active ? '#338b85' : '#94a3b8' }}><div className="section-title"><b>{rule.name}</b><span>{rule.active ? 'Ativa' : 'Inativa'}</span></div><p className="notice">{triggerLabel(rule.trigger_type)} • {rule.stage_name || 'sem etapa'} • {rule.delay_minutes} min</p><p className="notice">{rule.message || rule.description || 'Sem mensagem configurada.'}</p><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}><button className="btn small" onClick={() => startEdit(rule)}>Editar</button><button className={rule.active ? 'btn small danger' : 'btn small success'} onClick={() => toggleRule(rule)}>{rule.active ? 'Inativar' : 'Ativar'}</button></div></div>)}
        {!rules.length && <div className="empty">Nenhuma automação criada ainda.</div>}
      </div>

      <div className="timeline-item" style={{ marginTop: 16 }}><div className="section-title"><b>Execuções recentes</b><span>{runs.length}</span></div><div className="timeline" style={{ marginTop: 12 }}>{runs.slice(0, 6).map((run) => <div className="timeline-item" key={run.id}><b>{run.status}</b><p className="notice">{run.result || 'Automação executada.'}</p><small>{formatDate(run.created_at)}</small></div>)}{!runs.length && <div className="empty">Nenhuma execução registrada ainda.</div>}</div></div>
    </div>
  );
}
