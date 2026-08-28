"use client";

import { useEffect, useState } from 'react';
import { createCampaign, loadCampaigns, processCampaign, type CampaignForm, type MessageCampaign } from '@/lib/crm/campaign-admin';

const segmentOptions=[
  {value:'lead_quente',label:'Leads quentes',description:'Contatos com maior intenção de compra.'},
  {value:'lead_morno',label:'Leads mornos',description:'Contatos que precisam de nutrição.'},
  {value:'lead_frio',label:'Leads frios',description:'Base para reativação cuidadosa.'},
  {value:'propostas_enviadas',label:'Propostas enviadas',description:'Oportunidades abertas na etapa Proposta Enviada.'},
  {value:'todos_leads',label:'Todos os leads',description:'Base geral da empresa, sem arquivados.'}
];
const templates=[
  {name:'Retomada de proposta',segment_type:'propostas_enviadas',message:'Olá! Passando para saber se ficou alguma dúvida sobre a proposta enviada. Posso te ajudar com o próximo passo?',scheduled_at:''},
  {name:'Lead quente prioritário',segment_type:'lead_quente',message:'Olá! Recebemos seu interesse e estamos disponíveis para continuar seu atendimento. Qual melhor horário?',scheduled_at:''},
  {name:'Reativação comercial',segment_type:'lead_morno',message:'Olá! Tudo bem? Estou retomando nosso contato para saber se ainda podemos ajudar com a solução que você buscou.',scheduled_at:''}
];
const emptyForm:CampaignForm={name:'',segment_type:'lead_quente',message:'',scheduled_at:''};
function fmt(value?:string|null){return value?new Date(value).toLocaleString('pt-BR'):'—'}
function segmentLabel(value:string){return segmentOptions.find(o=>o.value===value)?.label||value}
function statusLabel(value:string){if(value==='scheduled')return'Agendada';if(value==='completed')return'Concluída';if(value==='sending')return'Enviando';if(value==='draft')return'Pronta';return value}

export function CampaignPanel(){
  const [campaigns,setCampaigns]=useState<MessageCampaign[]>([]);
  const [form,setForm]=useState<CampaignForm>(emptyForm);
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [processingId,setProcessingId]=useState<string|null>(null);

  async function refresh(){setLoading(true);try{setCampaigns(await loadCampaigns())}catch(e){console.error(e)}finally{setLoading(false)}}
  useEffect(()=>{refresh()},[]);

  async function submit(){
    if(!form.name.trim()||!form.message.trim())return alert('Informe nome e mensagem.');
    setSaving(true);
    try{
      const campaign=await createCampaign(form);
      await refresh();setForm(emptyForm);
      alert(form.scheduled_at?`Campanha agendada para ${fmt(campaign.scheduled_at)} com ${campaign.total_recipients} destinatário(s).`:`Campanha preparada com ${campaign.total_recipients} destinatário(s).`);
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível preparar a campanha.')}finally{setSaving(false)}
  }

  async function sendNow(campaign:MessageCampaign){
    setProcessingId(campaign.id);
    try{
      const result=await processCampaign(campaign.id);await refresh();
      alert(`Fila processada. Enviadas: ${result.sent}. Falhas: ${result.failed}. Restantes: ${result.queued}.`);
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível enviar a campanha.')}finally{setProcessingId(null)}
  }

  const scheduled=campaigns.filter(c=>c.status==='scheduled').length;
  const sent=campaigns.reduce((sum,c)=>sum+Number(c.sent_count||0),0);
  const failed=campaigns.reduce((sum,c)=>sum+Number(c.failed_count||0),0);

  return <div className="card pad settings-panel">
    <div className="section-title">
      <div><span className="panel-eyebrow">Comunicação comercial</span><h2>Campanhas WhatsApp</h2><p className="panel-subtitle">Envio manual ou agendado para contatos com opt-in. O motor verifica a fila a cada 5 minutos e registra o resultado por destinatário.</p></div>
      <span>{loading?'Carregando...':`${campaigns.length} campanha(s)`}</span>
    </div>

    <div className="automation-summary">
      <div><small>Agendadas</small><strong>{scheduled}</strong><span>aguardando horário</span></div>
      <div><small>Enviadas</small><strong>{sent}</strong><span>mensagens confirmadas</span></div>
      <div><small>Falhas</small><strong>{failed}</strong><span>registradas para correção</span></div>
    </div>

    <div className="grid two-col">
      <div className="timeline-item" style={{margin:0}}>
        <div className="section-title"><div><b>Nova campanha</b><p className="panel-subtitle">Sem horário = fila manual. Com horário = envio automático.</p></div><span>opt-in obrigatório</span></div>
        <div className="form-grid">
          <input className="input full" placeholder="Nome da campanha" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
          <select className="select full" value={form.segment_type} onChange={e=>setForm({...form,segment_type:e.target.value})}>{segmentOptions.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <textarea className="textarea full" placeholder="Mensagem" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
          <label className="notice full">Agendar envio (opcional)<input className="input" type="datetime-local" value={form.scheduled_at} onChange={e=>setForm({...form,scheduled_at:e.target.value})}/></label>
          <button className="btn primary full" disabled={saving} onClick={submit}>{saving?'Salvando...':form.scheduled_at?'Agendar campanha':'Preparar campanha'}</button>
        </div>
        <div className="operation-feedback" style={{marginTop:12}}><b>Entrega real</b><span>O CLACK usa a Cloud API e preserva o retorno do provedor. Para contatos fora da janela de atendimento da Meta, use um template previamente aprovado para evitar rejeição.</span></div>
      </div>

      <div className="timeline-item" style={{margin:0,background:'linear-gradient(135deg,#0FA3B1 0%,#B5E2FA 68%,#EDDEA4 100%)',borderLeft:'none'}}>
        <span className="panel-eyebrow" style={{color:'#10282C'}}>Modelos rápidos</span>
        <b style={{color:'#10282C'}}>Comece com uma mensagem objetiva</b>
        <p style={{color:'#36545A',fontSize:12}}>Os modelos abaixo preenchem a campanha; revise antes de enviar.</p>
        <div style={{display:'grid',gap:8,marginTop:12}}>{templates.map(t=><button className="btn" key={t.name} onClick={()=>setForm(t)} style={{textAlign:'left'}}><b>{t.name}</b><br/><small>{segmentLabel(t.segment_type)}</small></button>)}</div>
      </div>
    </div>

    <div className="timeline" style={{marginTop:16}}>
      {campaigns.map(c=><div className="automation-row" key={c.id}>
        <div><div className="section-title" style={{marginBottom:4}}><b>{c.name}</b><span>{statusLabel(c.status)}</span></div><small>{segmentLabel(c.segment_type)} · {c.total_recipients} destinatário(s) · criada {fmt(c.created_at)}</small>{c.scheduled_at&&<p><b>Agendada:</b> {fmt(c.scheduled_at)}</p>}<p>{c.message}</p><small>Enviadas {c.sent_count||0} · Falhas {c.failed_count||0} · Fila {c.queued_count??c.total_recipients}</small></div>
        <div className="automation-actions">{c.status!=='completed'&&c.total_recipients>0&&<button className="btn small primary" disabled={processingId===c.id} onClick={()=>sendNow(c)}>{processingId===c.id?'Enviando...':'Enviar agora'}</button>}</div>
      </div>)}
      {!campaigns.length&&<div className="empty">Nenhuma campanha criada. Cadastre contatos com opt-in para formar uma fila real.</div>}
    </div>
  </div>;
}
