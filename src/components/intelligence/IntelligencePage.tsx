"use client";

import { useEffect, useMemo, useState } from 'react';
import { loadOneOpsSnapshot, type OneOpsSnapshot } from '@/lib/crm/one-ops-client';
import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Task } from '@/types/crm';

function probabilityFor(deal:Opportunity){
  if(typeof deal.probability==='number')return Math.max(0,Math.min(100,deal.probability));
  const stage=(deal.stage||'').toLowerCase();
  if(stage.includes('negocia'))return 75;if(stage.includes('proposta'))return 60;if(stage.includes('qualifica'))return 40;return 20;
}
function status(ok:boolean){return <span className={ok?'health ok':'health warn'}>{ok?'Operando':'Atenção'}</span>}

export function IntelligencePage({leads,deals,tasks}:{leads:Lead[];deals:Opportunity[];tasks:Task[]}){
  const [ops,setOps]=useState<OneOpsSnapshot|null>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let stop=false;loadOneOpsSnapshot().then(data=>!stop&&setOps(data)).catch(e=>!stop&&setError(e instanceof Error?e.message:'Falha ao carregar operação.'));return()=>{stop=true}},[]);

  const open=deals.filter(d=>d.status==='Aberta');
  const won=deals.filter(d=>d.status==='Ganha');
  const pipeline=open.reduce((s,d)=>s+Number(d.value||0),0);
  const forecast=open.reduce((s,d)=>s+Number(d.value||0)*(probabilityFor(d)/100),0);
  const revenue=won.reduce((s,d)=>s+Number(d.value||0),0);
  const hot=leads.filter(l=>l.temperature==='Quente').length;
  const pending=tasks.filter(t=>!['Concluída','Cancelada'].includes(t.status)).length;

  const actions=useMemo(()=>{
    const list:Array<{engine:string;title:string;detail:string;level:'high'|'medium'}>=[];
    if((ops?.unassignedConversations||0)>0)list.push({engine:'ATENDE',title:'Assumir conversas sem responsável',detail:`${ops?.unassignedConversations} conversa(s) aguardam dono.`,level:'high'});
    if(hot>0)list.push({engine:'ENTENDE',title:'Priorizar contatos quentes',detail:`${hot} contato(s) têm maior temperatura comercial.`,level:'high'});
    if((ops?.overdueTasks||0)>0)list.push({engine:'EXECUTA',title:'Eliminar tarefas vencidas',detail:`${ops?.overdueTasks} ação(ões) passaram do prazo.`,level:'high'});
    if(open.length>0)list.push({engine:'VENDE',title:'Mover oportunidades paradas',detail:`${open.length} negócio(s) somam ${brl(pipeline)} em aberto.`,level:'medium'});
    if((ops?.pendingInvoices||0)>0)list.push({engine:'RESOLVE',title:'Fechar ciclo financeiro',detail:`${ops?.pendingInvoices} recebível(is) ainda não constam como pagos.`,level:'medium'});
    if((ops?.sources.length||0)>0)list.push({engine:'APRENDE',title:'Comparar origens',detail:`${ops?.sources[0]?.name} lidera a entrada atual com ${ops?.sources[0]?.count} contato(s).`,level:'medium'});
    return list.slice(0,6);
  },[ops,hot,open.length,pipeline]);

  return <div className="workspace-stack one-workspace">
    <section className="one-hero card pad">
      <div><span className="one-kicker">ONE CORE DENTRO DO CLACK</span><h2>Comando operacional</h2><p>Atendimento, execução, receita e aprendizado lidos da mesma operação — sem cards conceituais soltos.</p></div>
      <div className="engine-line">{['ATENDE','ENTENDE','EXECUTA','RESOLVE','VENDE','APRENDE'].map(e=><span key={e}>{e}</span>)}</div>
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
        <div className="section-title"><div><h2>Próximas ações</h2><span>prioridades calculadas</span></div></div>
        <div className="action-stack">{actions.map(a=><div className={`action-card ${a.level}`} key={a.engine+a.title}><span>{a.engine}</span><div><b>{a.title}</b><p>{a.detail}</p></div></div>)}{!actions.length&&<div className="empty">Nenhum alerta crítico. Continue alimentando a operação real.</div>}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><h2>Integration Hub</h2><span>estado real dos conectores</span></div></div>
        {error&&<p className="notice">{error}</p>}
        <div className="integration-grid">
          <div><b>Supabase</b><small>Auth + PostgreSQL + RLS</small>{status(Boolean(ops?.integration.supabase))}</div>
          <div><b>WhatsApp</b><small>{ops?.integration.whatsappNumber||'Conta / Cloud API'}</small>{status(Boolean(ops?.integration.whatsappAccount&&ops?.integration.whatsappProvider))}</div>
          <div><b>Webhook</b><small>entrada de mensagens</small>{status(Boolean(ops?.integration.webhook))}</div>
          <div><b>Automações</b><small>{ops?.activeAutomations||0} regras · {ops?.activeFlows||0} fluxos</small>{status(Boolean(ops?.integration.automation))}</div>
          <div><b>Agente Will</b><small>apoio ao atendimento</small>{status(Boolean(ops?.integration.ai))}</div>
          <div><b>Runtime</b><small>aplicação online</small>{status(Boolean(ops?.integration.runtime))}</div>
        </div>
      </div>
    </section>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><h2>OmniRoute</h2><span>origens reais</span></div></div>
        <div className="report-bars">{ops?.sources.length?ops.sources.slice(0,8).map(item=><div className="bar" key={item.name}><span><b>{item.name}</b><small>{item.count}</small></span><i style={{width:`${Math.max(8,(item.count/Math.max(ops.sources[0]?.count||1,1))*100)}%`}}/></div>):<div className="empty">Sem origens registradas.</div>}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><h2>Saúde da operação</h2><span>{ops?.companyName||'empresa atual'}</span></div></div>
        <div className="score-grid">
          <div><strong>{ops?.contacts??leads.length}</strong><span>contatos</span></div>
          <div><strong>{ops?.resolvedConversations??0}</strong><span>conversas resolvidas</span></div>
          <div><strong>{ops?.automationRuns??0}</strong><span>execuções automáticas</span></div>
          <div><strong>{ops?.activeProducts??0}</strong><span>ofertas ativas</span></div>
        </div>
        <p className="notice">O ONE Core agora lê serviços que já existem no CLACK. Ele não representa uma plataforma paralela nem um painel de promessas.</p>
      </div>
    </section>
  </div>;
}
