"use client";

import { useEffect, useState } from 'react';
import { loadOnboarding, saveOnboarding, type OnboardingData, type OnboardingDiagnostics, type OnboardingEvent } from '@/lib/crm/onboarding-client';
import type { Screen } from '@/types/crm';

const steps=[
  {key:'empresa',title:'Empresa',description:'Dados básicos e identidade válidos.',screen:'settings' as Screen},
  {key:'usuarios',title:'Equipe e acessos',description:'Usuários ativos com responsabilidades.',screen:'settings' as Screen},
  {key:'produtos',title:'Catálogo',description:'Oferta real com preço e cobrança.',screen:'products' as Screen},
  {key:'funil',title:'Pipeline',description:'Etapas reais configuradas para vendas.',screen:'kanban' as Screen},
  {key:'mensagens',title:'Comunicação',description:'Modelos de mensagem prontos para uso.',screen:'messages' as Screen},
  {key:'atendimento',title:'Atendimento',description:'Fila e histórico disponíveis para operação.',screen:'inbox' as Screen},
  {key:'financeiro',title:'Financeiro',description:'Recebimentos e vendas conectados.',screen:'finance' as Screen},
  {key:'automacoes',title:'Automações',description:'Regras ou fluxos ativos no motor.',screen:'settings' as Screen,hash:'automacoes'},
  {key:'whatsapp',title:'WhatsApp',description:'Conta e provedor oficial configurados.',screen:'settings' as Screen,hash:'integracoes'},
  {key:'treinamento',title:'Treinamento',description:'Validação final pela equipe responsável.',screen:'dashboard' as Screen}
];
const defaults=Object.fromEntries(steps.map(s=>[s.key,false]));
const fmt=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR'):'—';

function diagnosed(diag:OnboardingDiagnostics|null,current:Record<string,boolean>){
  if(!diag)return current;
  return {
    ...current,
    empresa:diag.company_ready,
    usuarios:diag.active_users>0,
    produtos:diag.active_products>0,
    funil:diag.pipeline_stages>0,
    mensagens:diag.quick_messages>0,
    atendimento:diag.open_conversations>0||current.atendimento,
    financeiro:diag.finance_records>0||current.financeiro,
    automacoes:diag.active_flows>0||diag.active_rules>0,
    whatsapp:diag.whatsapp_account&&diag.whatsapp_provider
  };
}

export function OnboardingPage({setScreen}:{setScreen:(screen:Screen)=>void}){
  const [onboarding,setOnboarding]=useState<OnboardingData|null>(null),[diag,setDiag]=useState<OnboardingDiagnostics|null>(null),[events,setEvents]=useState<OnboardingEvent[]>([]);
  const [notes,setNotes]=useState(''),[currentStep,setCurrentStep]=useState('Configuração inicial'),[status,setStatus]=useState('Em implantação'),[busy,setBusy]=useState(false);

  async function refresh(){
    setBusy(true);
    try{
      const data=await loadOnboarding();setOnboarding(data.onboarding);setDiag(data.diagnostics);setEvents(data.events);
      setNotes(data.onboarding.notes||'');setCurrentStep(data.onboarding.current_step||'Configuração inicial');setStatus(data.onboarding.status||'Em implantação');
    }catch(e){alert(e instanceof Error?e.message:'Falha ao carregar implantação.')}finally{setBusy(false)}
  }
  useEffect(()=>{refresh()},[]);

  const saved={...defaults,...(onboarding?.checklist||{})};
  const checklist=diagnosed(diag,saved);
  const completed=Object.values(checklist).filter(Boolean).length;
  const score=Math.round(completed/steps.length*100);

  async function validateNow(){
    setBusy(true);
    try{
      const data=await loadOnboarding();
      const next=diagnosed(data.diagnostics,{...defaults,...(data.onboarding.checklist||{})});
      const savedRow=await saveOnboarding({checklist:next,current_step:currentStep,status,notes});
      setOnboarding(savedRow);setDiag(data.diagnostics);await refresh();
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível validar a implantação.')}finally{setBusy(false)}
  }

  async function save(){
    setBusy(true);
    try{const savedRow=await saveOnboarding({checklist,current_step:currentStep,status,notes});setOnboarding(savedRow);await refresh()}
    catch(e){alert(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}
  }

  function openStep(step:any){
    if(step.hash&&typeof window!=='undefined')window.location.hash=step.hash;
    setScreen(step.screen);
  }

  return <div className="workspace-stack">
    <section className="onboarding-hero card pad">
      <div><span className="one-kicker">IMPLANTAÇÃO OPERACIONAL</span><h2>Diagnóstico que leva à ação</h2><p>Cada bloco verifica algo real do sistema. “Concluído” significa que existe configuração ou uso correspondente — não apenas um checklist marcado.</p></div>
      <div className="launch-score"><strong>{score}%</strong><span>prontidão real</span></div>
    </section>

    <section className="grid metrics compact-metrics">
      <div className="card metric"><span>Equipe ativa</span><strong>{diag?.active_users||0}</strong><small>acessos reais</small></div>
      <div className="card metric"><span>Ofertas</span><strong>{diag?.active_products||0}</strong><small>catálogo ativo</small></div>
      <div className="card metric"><span>Etapas</span><strong>{diag?.pipeline_stages||0}</strong><small>pipeline</small></div>
      <div className="card metric"><span>Automações</span><strong>{(diag?.active_flows||0)+(diag?.active_rules||0)}</strong><small>regras + fluxos</small></div>
      <div className="card metric"><span>WhatsApp</span><strong>{diag?.whatsapp_account&&diag?.whatsapp_provider?'OK':'—'}</strong><small>conta + provedor</small></div>
    </section>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">Validação</span><h2>Blocos de ativação</h2><p className="panel-subtitle">{completed}/{steps.length} blocos entregam evidência operacional.</p></div><button className="btn primary small" onClick={validateNow} disabled={busy}>{busy?'Validando...':'Validar agora'}</button></div>
        <div className="activation-grid">
          {steps.map(step=><div key={step.key} className={checklist[step.key]?'onboarding-block done':'onboarding-block'}>
            <span className="state-dot">{checklist[step.key]?'✓':'!'}</span>
            <div><b>{step.title}</b><small>{step.description}</small></div>
            <div className="block-actions"><span className={checklist[step.key]?'health ok':'health warn'}>{checklist[step.key]?'Ativo':'Pendente'}</span><button className="btn small" onClick={()=>openStep(step)}>Configurar</button></div>
          </div>)}
        </div>
        <div className="operation-feedback" style={{marginTop:12}}><b>O que este quadro faz?</b><span>Lê usuários, catálogo, funil, mensagens, financeiro, automações e WhatsApp. Os botões “Configurar” levam direto ao módulo que resolve a pendência.</span></div>
      </div>

      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">Controle</span><h2>Implantação</h2><p className="panel-subtitle">Registre o marco atual e o próximo passo da empresa.</p></div><span>{status}</span></div>
        <div className="form-grid">
          <select className="select full" value={status} onChange={e=>setStatus(e.target.value)}><option>Em implantação</option><option>Em operação assistida</option><option>Liberado para uso</option><option>Concluído</option></select>
          <input className="input full" value={currentStep} onChange={e=>setCurrentStep(e.target.value)} placeholder="Próximo marco"/>
          <textarea className="textarea full" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Observações da implantação"/>
          <button className="btn primary full" disabled={busy} onClick={save}>{busy?'Salvando...':'Salvar progresso'}</button>
        </div>
        <div className="journey-line"><span>Configurar</span><b>→</b><span>Conectar</span><b>→</b><span>Testar</span><b>→</b><span>Treinar</span><b>→</b><span>Operar</span></div>
      </div>
    </section>

    <section className="card pad"><div className="section-title"><div><span className="panel-eyebrow">Rastreabilidade</span><h2>Histórico</h2><p className="panel-subtitle">Registros das validações e alterações da implantação.</p></div><span>{events.length}</span></div><div className="compact-list">{events.map(e=><div className="compact-row" key={e.id}><div><b>{e.action}</b><small>{fmt(e.created_at)}</small></div></div>)}{!events.length&&<div className="empty">Nenhum evento de implantação registrado.</div>}</div></section>
  </div>;
}
