"use client";

import { useEffect, useState } from 'react';
import { loadOnboarding, saveOnboarding, type OnboardingData, type OnboardingDiagnostics, type OnboardingEvent } from '@/lib/crm/onboarding-client';

const steps=[
  {key:'empresa',title:'Empresa',description:'Dados básicos e identidade da operação.'},
  {key:'usuarios',title:'Equipe e acessos',description:'Perfis ativos com responsabilidades definidas.'},
  {key:'produtos',title:'Catálogo',description:'Ofertas reais com preço e cobrança.'},
  {key:'funil',title:'Pipeline',description:'Etapas e probabilidades ajustadas ao negócio.'},
  {key:'mensagens',title:'Comunicação',description:'Modelos próprios e tom da marca.'},
  {key:'atendimento',title:'Atendimento',description:'Fila, responsáveis e histórico operando.'},
  {key:'financeiro',title:'Financeiro',description:'Venda ganha conectada a recebimento.'},
  {key:'automacoes',title:'Automações',description:'Fluxos e regras úteis à rotina.'},
  {key:'whatsapp',title:'WhatsApp',description:'Conta oficial, webhook e envio validados.'},
  {key:'treinamento',title:'Treinamento',description:'Equipe conhece seu caminho diário no CLACK.'}
];
const defaults=Object.fromEntries(steps.map(s=>[s.key,false]));
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR'):'—';

export function OnboardingPage(){
  const [onboarding,setOnboarding]=useState<OnboardingData|null>(null),[diag,setDiag]=useState<OnboardingDiagnostics|null>(null),[events,setEvents]=useState<OnboardingEvent[]>([]);
  const [notes,setNotes]=useState(''),[currentStep,setCurrentStep]=useState('Configuração inicial'),[status,setStatus]=useState('Em implantação'),[busy,setBusy]=useState(false);
  async function refresh(){setBusy(true);try{const data=await loadOnboarding();setOnboarding(data.onboarding);setDiag(data.diagnostics);setEvents(data.events);setNotes(data.onboarding.notes||'');setCurrentStep(data.onboarding.current_step||'Configuração inicial');setStatus(data.onboarding.status||'Em implantação')}catch(e){alert(e instanceof Error?e.message:'Falha ao carregar implantação.')}finally{setBusy(false)}}
  useEffect(()=>{refresh()},[]);
  const checklist={...defaults,...(onboarding?.checklist||{})};
  const completed=Object.values(checklist).filter(Boolean).length;
  const score=onboarding?.launch_score??Math.round(completed/steps.length*100);

  function toggle(key:string){const next={...checklist,[key]:!checklist[key]};setOnboarding(current=>current?{...current,checklist:next,launch_score:Math.round(Object.values(next).filter(Boolean).length/steps.length*100)}:current)}
  function diagnose(){const next: Record<string, boolean> = {...checklist,empresa:true};if((diag?.active_users||0)>0)next.usuarios=true;if((diag?.active_products||0)>0)next.produtos=true;if((diag?.pipeline_stages||0)>0)next.funil=true;if((diag?.active_flows||0)>0)next.automacoes=true;setOnboarding(current=>current?{...current,checklist:next,launch_score:Math.round(Object.values(next).filter(Boolean).length/steps.length*100)}:current)}
  async function save(){setBusy(true);try{const saved=await saveOnboarding({checklist,current_step:currentStep,status,notes});setOnboarding(saved);await refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}}

  return <div className="workspace-stack">
    <section className="onboarding-hero card pad"><div><span className="one-kicker">IMPLANTAÇÃO ORIENTADA A OPERAÇÃO</span><h2>Da configuração ao uso diário</h2><p>O objetivo não é preencher checklist: é validar que cada bloco entrega resposta, venda ou execução no mundo real.</p></div><div className="launch-score"><strong>{score}%</strong><span>prontidão</span></div></section>
    <section className="grid metrics compact-metrics"><div className="card metric"><span>Equipe ativa</span><strong>{diag?.active_users||0}</strong><small>acessos</small></div><div className="card metric"><span>Ofertas</span><strong>{diag?.active_products||0}</strong><small>ativas</small></div><div className="card metric"><span>Etapas</span><strong>{diag?.pipeline_stages||0}</strong><small>pipeline</small></div><div className="card metric"><span>Fluxos</span><strong>{diag?.active_flows||0}</strong><small>automação</small></div></section>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><h2>Blocos de ativação</h2><span>{completed}/{steps.length}</span></div><button className="btn small" onClick={diagnose}>Ler diagnóstico</button></div>
        <div className="activation-grid">{steps.map(step=><button key={step.key} className={checklist[step.key]?'activation-card done':'activation-card'} onClick={()=>toggle(step.key)}><span>{checklist[step.key]?'✓':'○'}</span><div><b>{step.title}</b><small>{step.description}</small></div></button>)}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><h2>Controle da implantação</h2><span>{status}</span></div></div>
        <div className="form-grid"><select className="select full" value={status} onChange={e=>setStatus(e.target.value)}><option>Em implantação</option><option>Em operação assistida</option><option>Liberado para uso</option><option>Concluído</option></select><input className="input full" value={currentStep} onChange={e=>setCurrentStep(e.target.value)} placeholder="Próximo marco"/><textarea className="textarea full" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observações da implantação"/><button className="btn primary full" disabled={busy} onClick={save}>{busy?'Salvando...':'Salvar progresso'}</button></div>
        <div className="journey-line"><span>Configurar</span><b>→</b><span>Conectar</span><b>→</b><span>Testar</span><b>→</b><span>Treinar</span><b>→</b><span>Operar</span></div>
      </div>
    </section>

    <section className="card pad"><div className="section-title"><div><h2>Histórico</h2><span>{events.length}</span></div></div><div className="compact-list">{events.map(e=><div className="compact-row" key={e.id}><div><b>{e.action}</b><small>{fmt(e.created_at)}</small></div></div>)}{!events.length&&<div className="empty">Nenhum evento de implantação registrado.</div>}</div></section>
  </div>;
}
