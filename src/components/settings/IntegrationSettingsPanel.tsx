"use client";

import { useEffect, useState } from 'react';
import { getFreshAccessToken } from '@/lib/supabase/client';

type Health={
  runtime?:string;supabase?:boolean;
  whatsapp?:{account?:any;providerConfigured?:boolean;webhookConfigured?:boolean};
  automation?:{activeFlows?:number;activeRules?:number;lastRunAt?:string|null;engineHealthy?:boolean};
  publicAutomation?:{active?:number;lastRunAt?:string|null;engineHealthy?:boolean};
  campaigns?:{scheduled?:number;lastRunAt?:string|null;engineHealthy?:boolean};
  ai?:{enabled?:boolean;engine?:string};
};

function state(ok:boolean,label='Operando'){return <span className={ok?'health ok':'health warn'}>{ok?label:'Atenção'}</span>}
function fmt(v?:string|null){return v?new Date(v).toLocaleString('pt-BR'):'sem execução registrada'}

export function IntegrationSettingsPanel(){
  const [health,setHealth]=useState<Health|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  async function refresh(){
    setLoading(true);setError('');
    try{
      const token=await getFreshAccessToken();
      const response=await fetch('/api/health/operations',{headers:{Authorization:`Bearer ${token}`}});
      const result=await response.json();
      if(!response.ok||!result.ok)throw new Error(result.error||'Falha ao diagnosticar integrações.');
      setHealth(result);
    }catch(e){setError(e instanceof Error?e.message:'Falha ao diagnosticar integrações.')}finally{setLoading(false)}
  }
  useEffect(()=>{refresh()},[]);

  const cards=[
    {title:'Supabase',subtitle:'Autenticação, banco, RLS e realtime',ok:Boolean(health?.supabase),meta:'base operacional'},
    {title:'WhatsApp Cloud API',subtitle:health?.whatsapp?.account?.display_phone_number||'Conta oficial',ok:Boolean(health?.whatsapp?.account&&health?.whatsapp?.providerConfigured),meta:health?.whatsapp?.providerConfigured?'provedor configurado':'revise credenciais'},
    {title:'Webhook',subtitle:'Entrada e status de mensagens',ok:Boolean(health?.whatsapp?.webhookConfigured),meta:'Meta → CLACK'},
    {title:'Automação comercial',subtitle:`${health?.automation?.activeRules||0} regras · ${health?.automation?.activeFlows||0} fluxos`,ok:Boolean(health?.automation?.engineHealthy),meta:`última rodada: ${fmt(health?.automation?.lastRunAt)}`},
    {title:'Automação Público 360',subtitle:`${health?.publicAutomation?.active||0} avisos programados`,ok:Boolean(health?.publicAutomation?.engineHealthy),meta:`última rodada: ${fmt(health?.publicAutomation?.lastRunAt)}`},
    {title:'Campanhas automáticas',subtitle:`${health?.campaigns?.scheduled||0} campanha(s) agendada(s)`,ok:Boolean(health?.campaigns?.engineHealthy),meta:`última rodada: ${fmt(health?.campaigns?.lastRunAt)}`},
    {title:'Agente Will',subtitle:health?.ai?.engine||'Assistência operacional',ok:Boolean(health?.ai?.enabled),meta:'apoio ao atendimento'}
  ];

  return <div className="card pad settings-panel">
    <div className="section-title">
      <div><span className="panel-eyebrow">Integrações reais</span><h2>Saúde dos conectores</h2><p className="panel-subtitle">O quadro mostra somente serviços que responderam ao diagnóstico do ambiente atual.</p></div>
      <button className="btn" onClick={refresh} disabled={loading}>{loading?'Verificando...':'Atualizar diagnóstico'}</button>
    </div>
    {error&&<div className="operation-feedback warn"><b>Sessão ou conector precisa de atenção</b><span>{error}</span></div>}
    <div className="integration-status-grid">
      {cards.map(card=><div className="integration-status-card" key={card.title}><div><span className="panel-eyebrow">{card.meta}</span><h3>{card.title}</h3><p>{card.subtitle}</p></div>{state(card.ok)}</div>)}
    </div>
    <div className="operation-feedback">
      <b>Como interpretar</b>
      <span>“Operando” significa que o serviço respondeu ao diagnóstico e possui configuração útil. “Atenção” indica exatamente o bloco que precisa ser configurado ou reautenticado.</span>
    </div>
  </div>;
}
