"use client";

import { useEffect, useMemo, useState } from 'react';
import { loadPublicAutomations, savePublicAutomation, togglePublicAutomation, type PublicMessageAutomation, type PublicMessageAutomationRun } from '@/lib/public/public-automation';

type Contact={city?:string|null;state?:string|null;consent_status?:boolean;phone?:string|null};
const empty={name:'',purpose:'informacao_publica',audience_type:'all_consented',city:'',state:'PI',message:'',frequency:'once',next_run_at:''};

function fmt(v?:string|null){return v?new Date(v).toLocaleString('pt-BR'):'—'}

export function PublicAutomationPanel({contacts}:{contacts:Contact[]}){
  const [items,setItems]=useState<PublicMessageAutomation[]>([]);
  const [runs,setRuns]=useState<PublicMessageAutomationRun[]>([]);
  const [form,setForm]=useState<any>(empty);
  const [busy,setBusy]=useState(false);
  const cities=useMemo(()=>Array.from(new Set(contacts.map(c=>c.city).filter(Boolean) as string[])).sort(),[contacts]);
  const consented=contacts.filter(c=>c.consent_status&&c.phone).length;

  async function refresh(){try{const data=await loadPublicAutomations();setItems(data.automations);setRuns(data.runs)}catch(e){console.error(e)}}
  useEffect(()=>{refresh()},[]);

  async function save(){
    if(!form.name.trim()||!form.message.trim())return alert('Informe nome e mensagem.');
    setBusy(true);
    try{
      await savePublicAutomation({...form,next_run_at:form.next_run_at?new Date(form.next_run_at).toISOString():new Date().toISOString()});
      setForm(empty);await refresh();alert('Automação salva e agendada.');
    }catch(e){alert(e instanceof Error?e.message:'Não foi possível salvar.')}finally{setBusy(false)}
  }

  return <div className="card pad public-automation-card">
    <div className="section-title">
      <div><span className="panel-eyebrow">Automação informativa</span><h2>Mensagens programadas com consentimento</h2><p className="panel-subtitle">Agende avisos de serviço, eventos e informações públicas. A execução roda automaticamente e registra cada envio.</p></div>
      <span className="health ok">{items.filter(i=>i.active).length} ativa(s)</span>
    </div>

    <div className="automation-summary">
      <div><small>Base autorizada</small><strong>{consented}</strong><span>contatos com WhatsApp + consentimento</span></div>
      <div><small>Execuções registradas</small><strong>{runs.length}</strong><span>histórico operacional</span></div>
      <div><small>Motor</small><strong>5 min</strong><span>verificação automática</span></div>
    </div>

    <details className="create-panel automation-builder">
      <summary>+ Criar automação informativa</summary>
      <div className="form-grid" style={{marginTop:14}}>
        <input className="input full" placeholder="Nome da automação" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>
        <select className="select" value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})}>
          <option value="informacao_publica">Informação pública</option><option value="evento">Evento</option><option value="servico">Serviço / atendimento</option>
        </select>
        <select className="select" value={form.audience_type} onChange={e=>setForm({...form,audience_type:e.target.value})}>
          <option value="all_consented">Todos com consentimento</option><option value="city">Por cidade</option><option value="state">Por UF</option>
        </select>
        {form.audience_type==='city'&&<select className="select" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}><option value="">Selecione a cidade</option>{cities.map(city=><option key={city}>{city}</option>)}</select>}
        {form.audience_type!=='all_consented'&&<input className="input" placeholder="UF" value={form.state} onChange={e=>setForm({...form,state:e.target.value.toUpperCase()})}/>}
        <select className="select" value={form.frequency} onChange={e=>setForm({...form,frequency:e.target.value})}>
          <option value="once">Uma vez</option><option value="daily">Diariamente</option><option value="weekly">Semanalmente</option>
        </select>
        <input className="input" type="datetime-local" value={form.next_run_at} onChange={e=>setForm({...form,next_run_at:e.target.value})}/>
        <textarea className="textarea full" placeholder="Mensagem objetiva e informativa" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
        <button className="btn primary full" disabled={busy} onClick={save}>{busy?'Salvando...':'Agendar automação'}</button>
      </div>
      <p className="notice">A automação usa apenas contatos com consentimento registrado e finalidades de serviço, evento ou informação pública.</p>
    </details>

    <div className="automation-list">
      {items.map(item=><div className="automation-row" key={item.id}>
        <div><b>{item.name}</b><small>{item.frequency==='once'?'uma vez':item.frequency==='daily'?'diária':'semanal'} · próxima: {fmt(item.next_run_at)}</small><p>{item.message}</p></div>
        <div className="automation-actions"><span className={item.active?'health ok':'health warn'}>{item.active?'Ativa':'Pausada'}</span><button className="btn small" onClick={async()=>{await togglePublicAutomation(item.id,!item.active);await refresh()}}>{item.active?'Pausar':'Ativar'}</button></div>
      </div>)}
      {!items.length&&<div className="empty">Nenhuma automação informativa configurada.</div>}
    </div>

    {runs.length>0&&<details className="create-panel"><summary>Ver execuções recentes</summary><div className="compact-list" style={{marginTop:12}}>{runs.slice(0,8).map(run=><div className="compact-row" key={run.id}><div><b>{run.status}</b><small>{fmt(run.created_at)}</small></div><span>{run.sent_count} enviadas · {run.failed_count} falhas</span></div>)}</div></details>}
  </div>;
}
