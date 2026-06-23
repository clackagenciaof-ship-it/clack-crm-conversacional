"use client";

import { useEffect, useState } from 'react';
import { loadOnboarding, saveOnboarding, type OnboardingData, type OnboardingDiagnostics, type OnboardingEvent } from '@/lib/crm/onboarding-client';

const steps = [
  { key: 'empresa', title: 'Empresa configurada', description: 'Dados básicos, segmento, cidade e contato principal.' },
  { key: 'usuarios', title: 'Usuários e perfis', description: 'Admin, gestor, vendedor, atendente e financeiro com acessos definidos.' },
  { key: 'produtos', title: 'Produtos e serviços', description: 'Catálogo comercial pronto para proposta, funil e financeiro.' },
  { key: 'funil', title: 'Funil comercial', description: 'Etapas, cores, probabilidade e regras de avanço.' },
  { key: 'mensagens', title: 'Mensagens rápidas', description: 'Scripts, objeções, boas-vindas e retomada de proposta.' },
  { key: 'atendimento', title: 'Central de atendimento', description: 'Fila, responsável, status, prioridade e histórico do cliente.' },
  { key: 'financeiro', title: 'Financeiro', description: 'Recebimentos, vendas ganhas, baixas e valores.' },
  { key: 'automacoes', title: 'Automações', description: 'Follow-ups, fluxos automáticos e tarefas de retorno.' },
  { key: 'whatsapp', title: 'WhatsApp oficial', description: 'API Meta, opt-in e templates quando a conta oficial for aprovada.' },
  { key: 'treinamento', title: 'Treinamento e apresentação', description: 'Equipe treinada e roteiro de uso validado.' }
];

const defaultChecklist = Object.fromEntries(steps.map((step) => [step.key, false]));

function formatDate(value?: string | null) {
  if (!value) return 'Sem registro';
  return new Date(value).toLocaleString('pt-BR');
}

export function OnboardingPage() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [diagnostics, setDiagnostics] = useState<OnboardingDiagnostics | null>(null);
  const [events, setEvents] = useState<OnboardingEvent[]>([]);
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState('Implantação guiada');
  const [status, setStatus] = useState('Em operação assistida');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh(showAlert = false) {
    setLoading(true);
    try {
      const data = await loadOnboarding();
      setOnboarding(data.onboarding);
      setDiagnostics(data.diagnostics);
      setEvents(data.events);
      setNotes(data.onboarding.notes || 'Primeira empresa em uso real: Clack Growth Company. Operação liberada para vender, atender, acompanhar funil, financeiro, relatórios e automações.');
      setCurrentStep(data.onboarding.current_step || 'Go-live Clack Growth Company');
      setStatus(data.onboarding.status || 'Em operação assistida');
      if (showAlert) alert('Onboarding atualizado.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível carregar onboarding.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const checklist = { ...defaultChecklist, ...(onboarding?.checklist || {}) };
  const completed = Object.values(checklist).filter(Boolean).length;
  const score = onboarding?.launch_score || Math.round((completed / steps.length) * 100);
  const readyLabel = score >= 100 ? 'Pronto para vender e operar' : score >= 70 ? 'Liberado para uso assistido' : 'Preparando operação';

  async function persist(nextChecklist = checklist) {
    setSaving(true);
    try {
      const saved = await saveOnboarding({ checklist: nextChecklist, current_step: currentStep, status, notes });
      setOnboarding(saved);
      alert('Onboarding salvo.');
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar onboarding.');
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: string) {
    const next = { ...checklist, [key]: !checklist[key] };
    setOnboarding((current) => current ? { ...current, checklist: next, launch_score: Math.round((Object.values(next).filter(Boolean).length / steps.length) * 100) } : current);
  }

  function autoSuggest() {
    const next = { ...checklist };
    if ((diagnostics?.active_users || 0) >= 1) next.usuarios = true;
    if ((diagnostics?.active_products || 0) >= 1) next.produtos = true;
    if ((diagnostics?.pipeline_stages || 0) >= 5) next.funil = true;
    if ((diagnostics?.active_flows || 0) >= 1) next.automacoes = true;
    next.empresa = true;
    next.mensagens = true;
    next.atendimento = true;
    next.financeiro = true;
    setOnboarding((current) => current ? { ...current, checklist: next, launch_score: Math.round((Object.values(next).filter(Boolean).length / steps.length) * 100) } : current);
  }

  return <div className="grid" style={{ gap: 16 }}>
    <div className="grid metrics">
      <div className="card metric"><span>Status comercial</span><strong>{score}%</strong><small>{readyLabel}</small></div>
      <div className="card metric"><span>Checklist</span><strong>{completed}/{steps.length}</strong><small>etapas concluídas</small></div>
      <div className="card metric"><span>Usuários ativos</span><strong>{diagnostics?.active_users || 0}</strong><small>equipe vinculada</small></div>
      <div className="card metric"><span>Produtos ativos</span><strong>{diagnostics?.active_products || 0}</strong><small>catálogo</small></div>
      <div className="card metric"><span>Etapas do funil</span><strong>{diagnostics?.pipeline_stages || 0}</strong><small>jornada comercial</small></div>
      <div className="card metric"><span>Fluxos ativos</span><strong>{diagnostics?.active_flows || 0}</strong><small>automações</small></div>
    </div>

    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><h2>Onboarding SaaS</h2><p className="notice">Roteiro para implantar, vender e colocar a empresa em uso real. A Clack Growth Company é a primeira operação oficial.</p></div><span>{loading ? 'carregando' : status}</span></div>
        <div className="form-grid" style={{ marginBottom: 16 }}>
          <select className="select" value={status} onChange={(event) => setStatus(event.target.value)}><option>Em operação assistida</option><option>Liberado para venda</option><option>Em treinamento</option><option>Concluído</option></select>
          <input className="input" value={currentStep} onChange={(event) => setCurrentStep(event.target.value)} placeholder="Etapa atual" />
          <textarea className="textarea full" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Observações internas da implantação" />
          <button className="btn" onClick={autoSuggest}>Sugerir pelo diagnóstico</button>
          <button className="btn primary" disabled={saving} onClick={() => persist()}>{saving ? 'Salvando...' : 'Salvar onboarding'}</button>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {steps.map((step) => <div className="message-card" key={step.key} style={{ borderColor: checklist[step.key] ? 'rgba(51,139,133,.38)' : undefined }}>
            <div className="section-title"><strong>{step.title}</strong><span>{checklist[step.key] ? 'Concluído' : 'Pendente'}</span></div>
            <p className="notice">{step.description}</p>
            <button className={checklist[step.key] ? 'btn small success' : 'btn small'} onClick={() => toggle(step.key)}>{checklist[step.key] ? 'Marcar pendente' : 'Concluir etapa'}</button>
          </div>)}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title"><h2>Roteiro de venda e implantação</h2><span>Fase 13</span></div>
        <div className="timeline">
          <div className="timeline-item"><b>1. Diagnóstico</b><p className="notice">Entenda equipe, produto, funil, canais de atendimento e meta comercial.</p></div>
          <div className="timeline-item"><b>2. Configuração</b><p className="notice">Cadastre usuários, produtos, etapas, mensagens e automações básicas.</p></div>
          <div className="timeline-item"><b>3. Treinamento</b><p className="notice">Mostre o uso por perfil: gestor, vendedor, atendente e financeiro.</p></div>
          <div className="timeline-item"><b>4. Go-live</b><p className="notice">Ative rotina diária: leads, atendimento, funil, tarefas, financeiro e relatórios.</p></div>
          <div className="timeline-item"><b>5. Sucesso do cliente</b><p className="notice">Revise indicadores, gargalos e oportunidades de upgrade do plano.</p></div>
        </div>
      </div>
    </div>

    <div className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>Plano de entrada em operação</h2><span>{readyLabel}</span></div><p className="notice">Este painel não bloqueia a venda. Ele mostra a maturidade da implantação. A partir de 70%, o CRM já pode ser usado com cliente real em operação assistida. Com 100%, a empresa está totalmente treinada e padronizada.</p><p className="notice"><b>Primeira empresa em produção:</b> Clack Growth Company. Use agora para vender, cadastrar leads, atender, acompanhar funil, gerar tarefas, registrar financeiro e apresentar relatórios.</p><div className="report-bars" style={{ marginTop: 16 }}><div className="bar"><span><b>Progresso geral</b><b>{score}%</b></span><i style={{ width: `${Math.max(8, score)}%` }} /></div></div></div>
      <div className="card pad"><div className="section-title"><h2>Histórico do onboarding</h2><span>{events.length}</span></div><div className="timeline">{events.map((event) => <div className="timeline-item" key={event.id}><b>{event.action}</b><p className="notice">{formatDate(event.created_at)}</p></div>)}{!events.length && <div className="empty">Nenhum histórico registrado ainda.</div>}</div></div>
    </div>
  </div>;
}
