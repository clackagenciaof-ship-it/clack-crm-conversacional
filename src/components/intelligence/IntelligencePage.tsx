"use client";

import { useEffect, useMemo, useState } from 'react';
import { loadOneOpsSnapshot, type OneOpsSnapshot } from '@/lib/crm/one-ops-client';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Task, Screen } from '@/types/crm';

function probabilityFor(deal:Opportunity){
  if(typeof deal.probability==='number')return Math.max(0,Math.min(100,deal.probability));
  const stage=(deal.stage||'').toLowerCase();
  if(stage.includes('negocia'))return 75;if(stage.includes('proposta'))return 60;if(stage.includes('qualifica'))return 40;return 20;
}
function status(ok:boolean){return <span className={ok?'health ok':'health warn'}>{ok?'Operando':'Atenção'}</span>}
function fmt(value?:string|null){return value?new Date(value).toLocaleString('pt-BR'):'sem execução'}

export function IntelligencePage({leads,deals,tasks,setScreen}:{leads:Lead[];deals:Opportunity[];tasks:Task[];setScreen:(screen:Screen)=>void}){
  const [ops,setOps]=useState<OneOpsSnapshot|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function refresh(){
    setLoading(true);setError('');
    try{setOps(await loadOneOpsSnapshot())}
    catch(e){setError(e instanceof Error?e.message:'Falha ao carregar operação.')}finally{setLoading(false)}
  }
  useEffect(()=>{refresh()},[]);

  const open=deals.filter(d=>d.status==='Aberta');
  const won=deals.filter(d=>d.status==='Ganha');
  const pipeline=open.reduce((s,d)=>s+Number(d.value||0),0);
  const forecast=open.reduce((s,d)=>s+Number(d.value||0)*(probabilityFor(d)/100),0);
  const revenue=won.reduce((s,d)=>s+Number(d.value||0),0);
  const hot=leads.filter(l=>l.temperature==='Quente').length;
  const pending=tasks.filter(t=>!['Concluída','Cancelada'].includes(t.status)).length;

  const actions=useMemo(()=>{
    const list:Array<{engine:string;title:string;detail:string;level:'high'|'medium';screen:Screen}>=[];
    if((ops?.unassignedConversations||0)>0)list.push({engine:'ATENDE',title:'Assumir conversas sem responsável',detail:`${ops?.unassignedConversations} conversa(s) aguardam dono.`,level:'high',screen:'inbox'});
    if(hot>0)list.push({engine:'ENTENDE',title:'Priorizar contatos quentes',detail:`${hot} contato(s) têm maior temperatura comercial.`,level:'high',screen:'leads'});
    if((ops?.overdueTasks||0)>0)list.push({engine:'EXECUTA',title:'Eliminar tarefas vencidas',detail:`${ops?.overdueTasks} ação(ões) passaram do prazo.`,level:'high',screen:'tasks'});
    if(open.length>0)list.push({engine:'VENDE',title:'Mover oportunidades paradas',detail:`${open.length} negócio(s) somam ${brl(pipeline)} em aberto.`,level:'medium',screen:'kanban'});
    if((ops?.pendingInvoices||0)>0)list.push({engine:'RESOLVE',title:'Fechar ciclo financeiro',detail:`${ops?.pendingInvoices} recebível(is) ainda não constam como pagos.`,level:'medium',screen:'finance'});
    if((ops?.sources.length||0)>0)list.push({engine:'APRENDE',title:'Comparar origens',detail:`${ops?.sources[0]?.name} lidera a entrada atual com ${ops?.sources[0]?.count} contato(s).`,level:'medium',screen:'reports'});
    return list.slice(0,6);
  },[ops,hot,open.length,pipeline]);

  function openSettings(hash:string){
    if(typeof window!=='undefined')window.location.hash=hash;
    setScreen('settings');
  }

  const connectors=[
    {name:'Supabase',detail:'Auth + PostgreSQL + RLS + Realtime',ok:Boolean(ops?.integration.supabase)},
    {name:'WhatsApp',detail:ops?.integration.whatsappNumber||'Conta / Cloud API',ok:Boolean(ops?.integration.whatsappAccount&&ops?.integration.whatsappProvider)},
    {name:'Webhook',detail:'entrada e status de mensagens',ok:Boolean(ops?.integration.webhook)},
    {name:'Motor comercial',detail:`${ops?.activeAutomations||0} regras · ${ops?.activeFlows||0} fluxos · ${fmt(ops?.integration.lastAutomationRunAt)}`,ok:Boolean(ops?.integration.automationEngine)},
    {name:'Público 360',detail:`${ops?.integration.publicAutomationActive||0} automação(ões) · ${fmt(ops?.integration.lastPublicAutomationRunAt)}`,ok:Boolean(ops?.integration.publicAutomationEngine)},
    {name:'Campanhas',detail:`${ops?.integration.scheduledCampaigns||0} agendada(s) · ${fmt(ops?.integration.lastCampaignRunAt)}`,ok:Boolean(ops?.integration.campaignEngine)},
    {name:'Agente Will',detail:'apoio ao atendimento',ok:Boolean(ops?.integration.ai)}
  ];

  return <div className="workspace-stack one-workspace">
    <section className="one-hero card pad">
      <div><span className="one-kicker">ONE CORE</span><h2>Comando operacional</h2><p>Leitura unificada de atendimento, vendas, execução, integrações e automações com ações que levam direto ao módulo responsável.</p></div>
      <div className="card-actions"><button className="btn" onClick={refresh} disabled={loading}>{loading?'Atualizando...':'Atualizar diagnóstico'}</button><button className="btn primary" onClick={()=>openSettings('integracoes')}>Configurar integrações</button></div>
    </section>

    <section className="grid metrics executive-metrics">
      <div className="card metric"><span>Pipeline</span><strong>{brl(pipeline)}</strong><small>{open.length} abertos</small></div>
      <div className="card metric"><span>Forecast</span><strong>{brl(forecast)}</strong><small>ponderado por probabilidade</small></div>
      <div className="card metric"><span>Receita ganha</span><strong>{brl(revenue)}</strong><small>{won.length} vendas</small></div>
      <div className="card metric"><span>Conversas abertas</span><strong>{ops?.openConversations ?? '—'}</strong><small>{ops?.unassignedConversations||0} sem responsável</small></div>
      <div className="card metric"><span>Execução</span><strong>{ops?.pendingTasks ?? pending}</strong><small>tarefas pendentes</small></div>
    </section>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">Próxima melhor ação</span><h2>Prioridades calculadas</h2><p className="panel-subtitle">Clique na ação para ir ao módulo que resolve o problema.</p></div></div>
        <div className="action-stack">{actions.map(a=><button className={`action-card ${a.level}`} key={a.engine+a.title} onClick={()=>setScreen(a.screen)}><span>{a.engine}</span><div><b>{a.title}</b><p>{a.detail}</p></div></button>)}{!actions.length&&<div className="empty">Nenhum alerta crítico. Continue alimentando a operação real.</div>}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">Integrações</span><h2>Estado real dos conectores</h2><p className="panel-subtitle">Somente serviços diagnosticados. Sem “placeholder” de integração.</p></div></div>
        {error&&<div className="operation-feedback warn"><b>Atenção</b><span>{error}. Use “Atualizar diagnóstico” ou reentre se a sessão tiver expirado.</span></div>}
        <div className="integration-grid">
          {connectors.map(item=><div key={item.name}><b>{item.name}</b><small>{item.detail}</small>{status(item.ok)}</div>)}
        </div>
      </div>
    </section>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">OmniRoute</span><h2>Origem dos contatos</h2><p className="panel-subtitle">Distribuição da captação atual da empresa.</p></div></div>
        <div className="report-bars">{ops?.sources.length?ops.sources.slice(0,8).map(item=><div className="bar" key={item.name}><span><b>{item.name}</b><small>{item.count}</small></span><i style={{width:`${Math.max(8,(item.count/Math.max(ops.sources[0]?.count||1,1))*100)}%`}}/></div>):<div className="empty">Sem origens registradas.</div>}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><span className="panel-eyebrow">Saúde</span><h2>Operação da empresa</h2><p className="panel-subtitle">{ops?.companyName||'empresa atual'}</p></div></div>
        <div className="score-grid">
          <div><strong>{ops?.contacts??leads.length}</strong><span>contatos</span></div>
          <div><strong>{ops?.resolvedConversations??0}</strong><span>conversas resolvidas</span></div>
          <div><strong>{ops?.automationRuns??0}</strong><span>execuções automáticas</span></div>
          <div><strong>{ops?.activeProducts??0}</strong><span>ofertas ativas</span></div>
        </div>
      </div>
    </section>
  </div>;
}
