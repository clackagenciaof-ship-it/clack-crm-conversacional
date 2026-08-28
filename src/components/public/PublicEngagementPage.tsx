"use client";

import { useEffect, useMemo, useState } from 'react';
import { insertPublic, loadPublicOps, sendPublicInformation, updatePublic, type PublicOpsData } from '@/lib/public/public-engagement';

type Tab='overview'|'electorate'|'contacts'|'leaders'|'requests'|'tasks'|'events'|'agenda'|'geo'|'communication'|'assets'|'simulator'|'audit';

const tabs:Array<[Tab,string]>=[
  ['overview','Visão geral'],['electorate','Eleitorado'],['contacts','Contatos'],['leaders','Lideranças'],
  ['requests','Demandas'],['tasks','Tarefas'],['events','Eventos'],['agenda','Agenda'],
  ['geo','Geolocalização'],['communication','Comunicação'],['assets','Veículos & ativos'],['simulator','Simulador'],['audit','Auditoria']
];

const emptyData:PublicOpsData={territories:[],electorate:[],contacts:[],leaders:[],requests:[],events:[],agenda:[],assets:[],notices:[],simulations:[],audit:[],whatsappAccount:null};

function number(value:any){return Number(value||0)}
function fmt(value:any){return number(value).toLocaleString('pt-BR')}
function dateTime(value?:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('pt-BR')}
function pct(current:number,target:number){return target>0?Math.min(100,Math.round((current/target)*100)):0}

export function PublicEngagementPage(){
  const [tab,setTab]=useState<Tab>('overview');
  const [data,setData]=useState<PublicOpsData>(emptyData);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [territory,setTerritory]=useState({state:'PI',city:'',territory_name:'',electorate_total:'',population_total:'',latitude:'',longitude:'',source_name:'TSE / IBGE'});
  const [electorate,setElectorate]=useState({state:'PI',city:'',neighborhood:'',electorate_total:'',source_name:'TSE',source_date:''});
  const [contact,setContact]=useState({name:'',phone:'',email:'',address:'',neighborhood:'',city:'',state:'PI',postal_code:'',contact_type:'Contato',leader_id:'',consent_status:false,consent_channel:'WhatsApp'});
  const [leader,setLeader]=useState({name:'',phone:'',email:'',address:'',neighborhood:'',city:'',state:'PI',target_contacts:'0',notes:'',consent_status:false});
  const [request,setRequest]=useState({title:'',category:'Demanda',description:'',priority:'Média',status:'aberta',contact_id:''});
  const [event,setEvent]=useState({title:'',city:'',state:'PI',venue:'',starts_at:'',ends_at:'',purpose:'evento_publico',status:'Planejado',confirmed_count:'0'});
  const [agenda,setAgenda]=useState({title:'',category:'Compromisso',starts_at:'',ends_at:'',venue:'',city:'',state:'PI',responsible:'',notes:''});
  const [asset,setAsset]=useState({asset_type:'Veículo',name:'',identifier:'',city:'',state:'PI',responsible:'',status:'Disponível',notes:''});
  const [message,setMessage]=useState({contactId:'',purpose:'informacao_publica' as 'servico'|'evento'|'informacao_publica',text:''});
  const [simulation,setSimulation]=useState({name:'Cenário agregado',electorate_total:'',turnout_rate:'80',valid_vote_rate:'90',reference_share:'10'});
  const [selectedGeo,setSelectedGeo]=useState('');

  async function reload(){
    setLoading(true);
    try{setData(await loadPublicOps());setNotice('');}
    catch(error){setNotice(error instanceof Error?error.message:'Falha ao carregar Público 360.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{reload()},[]);

  async function create(table:string,payload:Record<string,unknown>,reset?:()=>void){
    setBusy(true);try{await insertPublic(table,payload);reset?.();await reload();}catch(error){alert(error instanceof Error?error.message:'Não foi possível salvar.');}finally{setBusy(false);}
  }

  const totalElectorate=useMemo(()=>data.electorate.reduce((s,r)=>s+number(r.electorate_total),0)||data.territories.reduce((s,r)=>s+number(r.electorate_total),0),[data]);
  const contactsByCity=useMemo(()=>Object.entries(data.contacts.reduce<Record<string,number>>((acc,row:any)=>{const k=row.city||'Sem cidade';acc[k]=(acc[k]||0)+1;return acc;},{})).sort((a,b)=>b[1]-a[1]),[data.contacts]);
  const electorateByCity=useMemo(()=>Object.entries(data.electorate.reduce<Record<string,number>>((acc,row:any)=>{const k=`${row.city}/${row.state}`;acc[k]=(acc[k]||0)+number(row.electorate_total);return acc;},{})).sort((a,b)=>b[1]-a[1]),[data.electorate]);
  const requestOpen=data.requests.filter((r:any)=>!['resolvida','arquivada'].includes(r.status)).length;
  const upcomingEvents=data.events.filter((r:any)=>!r.starts_at||new Date(r.starts_at).getTime()>=Date.now()).length;
  const consenting=data.contacts.filter((r:any)=>r.consent_status).length;
  const geoRows=data.territories.filter((r:any)=>r.latitude&&r.longitude);
  const geo=data.territories.find((r:any)=>r.id===selectedGeo)||geoRows[0]||null;
  const leaderProgress=data.leaders.map((l:any)=>({...l,current:data.contacts.filter((c:any)=>c.leader_id===l.id).length}));

  const sim=useMemo(()=>{
    const total=number(simulation.electorate_total),turnout=Math.round(total*number(simulation.turnout_rate)/100);
    const valid=Math.round(turnout*number(simulation.valid_vote_rate)/100),reference=Math.round(valid*number(simulation.reference_share)/100);
    return{total,turnout,valid,reference};
  },[simulation]);

  async function saveSimulation(){await create('public_simulations',{name:simulation.name,electorate_total:sim.total,turnout_rate:number(simulation.turnout_rate),valid_vote_rate:number(simulation.valid_vote_rate),reference_share:number(simulation.reference_share),projected_turnout:sim.turnout,projected_valid:sim.valid,projected_reference:sim.reference});}
  async function sendInfo(){if(!message.contactId||!message.text.trim())return alert('Selecione contato e escreva a mensagem.');setBusy(true);try{const result=await sendPublicInformation(message);alert(result.sent?'Mensagem enviada pelo WhatsApp.':'Mensagem registrada na fila; revise a configuração da Cloud API.');setMessage({...message,text:''});await reload();}catch(error){alert(error instanceof Error?error.message:'Falha no envio.');}finally{setBusy(false);}}

  function bars(rows:Array<[string,number]>,empty:string){
    const max=Math.max(...rows.map(([,v])=>v),1);
    return <div className="report-bars">{rows.length?rows.slice(0,10).map(([name,value])=><div className="bar" key={name}><span><b>{name}</b><small>{fmt(value)}</small></span><i style={{width:`${Math.max(8,(value/max)*100)}%`}}/></div>):<div className="empty">{empty}</div>}</div>;
  }

  return <div className="workspace-stack public-workspace">
    <section className="one-hero card pad public-hero">
      <div><span className="one-kicker">CLACK PÚBLICO 360</span><h2>Território, relacionamento e execução</h2><p>Uma vertical operacional com dados territoriais agregados, contatos, lideranças, demandas, agenda, eventos, comunicação e auditoria.</p></div>
      <div className="public-method"><span>MAPEAR</span><span>OUVIR</span><span>EXECUTAR</span><span>INFORMAR</span><span>MEDIR</span></div>
    </section>

    <nav className="workspace-tabs">{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>
    {notice&&<div className="card pad notice">{notice}</div>}
    {loading&&<div className="card pad">Sincronizando dados...</div>}

    {!loading&&tab==='overview'&&<>
      <section className="grid metrics executive-metrics">
        <div className="card metric"><span>Eleitorado agregado</span><strong>{fmt(totalElectorate)}</strong><small>fontes públicas cadastradas</small></div>
        <div className="card metric"><span>Contatos</span><strong>{data.contacts.length}</strong><small>{consenting} com consentimento</small></div>
        <div className="card metric"><span>Lideranças</span><strong>{data.leaders.length}</strong><small>rede operacional</small></div>
        <div className="card metric"><span>Demandas abertas</span><strong>{requestOpen}</strong><small>para acompanhamento</small></div>
        <div className="card metric"><span>Eventos futuros</span><strong>{upcomingEvents}</strong><small>planejados</small></div>
      </section>
      <section className="grid two-col"><div className="card pad"><div className="section-title"><h2>Eleitorado por cidade</h2><span>agregado</span></div>{bars(electorateByCity,'Cadastre dados oficiais por cidade.')}</div><div className="card pad"><div className="section-title"><h2>Contatos por cidade</h2><span>base de relacionamento</span></div>{bars(contactsByCity,'Nenhum contato cadastrado.')}</div></section>
      <section className="grid two-col"><div className="card pad"><div className="section-title"><h2>Rede de lideranças</h2><span>progresso de cadastros</span></div><div className="compact-list">{leaderProgress.slice(0,8).map((l:any)=><div className="compact-row" key={l.id}><div><b>{l.name}</b><small>{l.city}/{l.state} · {l.current}/{l.target_contacts||0} contatos</small></div><span className="health ok">{pct(l.current,number(l.target_contacts))}%</span></div>)}{!leaderProgress.length&&<div className="empty">Cadastre a primeira liderança.</div>}</div></div><div className="card pad"><div className="section-title"><h2>Operação WhatsApp</h2><span>canal conectado</span></div><div className="integration-grid"><div><b>Instância</b><small>{data.whatsappAccount?.display_phone_number||'não cadastrada'}</small><span className={data.whatsappAccount?'health ok':'health warn'}>{data.whatsappAccount?.status||'Atenção'}</span></div><div><b>Consentimento</b><small>contatos autorizados</small><span className="health ok">{consenting}</span></div></div><button className="btn primary" onClick={()=>setTab('communication')}>Abrir comunicação</button></div></section>
    </>}

    {!loading&&tab==='electorate'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Cadastrar estatística oficial</summary><div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Cidade" value={electorate.city} onChange={e=>setElectorate({...electorate,city:e.target.value})}/><input className="input" placeholder="UF" value={electorate.state} onChange={e=>setElectorate({...electorate,state:e.target.value.toUpperCase()})}/><input className="input" placeholder="Bairro / zona (opcional)" value={electorate.neighborhood} onChange={e=>setElectorate({...electorate,neighborhood:e.target.value})}/><input className="input" type="number" placeholder="Eleitorado total" value={electorate.electorate_total} onChange={e=>setElectorate({...electorate,electorate_total:e.target.value})}/><input className="input" placeholder="Fonte: TSE/TRE" value={electorate.source_name} onChange={e=>setElectorate({...electorate,source_name:e.target.value})}/><input className="input" type="date" value={electorate.source_date} onChange={e=>setElectorate({...electorate,source_date:e.target.value})}/><button className="btn primary" disabled={busy} onClick={()=>create('public_electorate_stats',{...electorate,electorate_total:number(electorate.electorate_total),source_date:electorate.source_date||null},()=>setElectorate({state:'PI',city:'',neighborhood:'',electorate_total:'',source_name:'TSE',source_date:''}))}>Salvar dado agregado</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Ranking territorial</h2><span>{fmt(totalElectorate)} registros agregados</span></div>{bars(electorateByCity,'Nenhum dado eleitoral agregado cadastrado.')}</div>
      <div className="card pad full-span"><div className="table-wrap"><table><thead><tr><th>Cidade</th><th>UF</th><th>Bairro/Zona</th><th>Eleitorado</th><th>Fonte</th><th>Data</th></tr></thead><tbody>{data.electorate.map((r:any)=><tr key={r.id}><td>{r.city}</td><td>{r.state}</td><td>{r.neighborhood||'—'}</td><td>{fmt(r.electorate_total)}</td><td>{r.source_name||'—'}</td><td>{r.source_date||'—'}</td></tr>)}</tbody></table></div></div>
    </section>}

    {!loading&&tab==='contacts'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Novo contato</summary><div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Nome" value={contact.name} onChange={e=>setContact({...contact,name:e.target.value})}/><input className="input" placeholder="WhatsApp" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})}/><input className="input" placeholder="E-mail" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})}/><input className="input" placeholder="Endereço" value={contact.address} onChange={e=>setContact({...contact,address:e.target.value})}/><input className="input" placeholder="Bairro" value={contact.neighborhood} onChange={e=>setContact({...contact,neighborhood:e.target.value})}/><input className="input" placeholder="Cidade" value={contact.city} onChange={e=>setContact({...contact,city:e.target.value})}/><input className="input" placeholder="UF" value={contact.state} onChange={e=>setContact({...contact,state:e.target.value.toUpperCase()})}/><select className="select" value={contact.leader_id} onChange={e=>setContact({...contact,leader_id:e.target.value})}><option value="">Sem liderança vinculada</option>{data.leaders.map((l:any)=><option value={l.id} key={l.id}>{l.name}</option>)}</select><label className="check-line"><input type="checkbox" checked={contact.consent_status} onChange={e=>setContact({...contact,consent_status:e.target.checked})}/> Consentimento para comunicações informativas</label><button className="btn primary" disabled={busy} onClick={()=>create('public_contacts',{...contact,leader_id:contact.leader_id||null},()=>setContact({name:'',phone:'',email:'',address:'',neighborhood:'',city:'',state:'PI',postal_code:'',contact_type:'Contato',leader_id:'',consent_status:false,consent_channel:'WhatsApp'}))}>Salvar contato</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Distribuição</h2><span>{data.contacts.length} contatos</span></div>{bars(contactsByCity,'Sem contatos.')}</div>
      <div className="card pad full-span"><div className="table-wrap"><table><thead><tr><th>Nome</th><th>WhatsApp</th><th>Bairro</th><th>Cidade</th><th>Liderança</th><th>Consentimento</th></tr></thead><tbody>{data.contacts.map((r:any)=><tr key={r.id}><td>{r.name}</td><td>{r.phone||'—'}</td><td>{r.neighborhood||'—'}</td><td>{r.city}/{r.state}</td><td>{data.leaders.find((l:any)=>l.id===r.leader_id)?.name||'—'}</td><td>{r.consent_status?'Sim':'Não'}</td></tr>)}</tbody></table></div></div>
    </section>}

    {!loading&&tab==='leaders'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Nova liderança</summary><div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Nome" value={leader.name} onChange={e=>setLeader({...leader,name:e.target.value})}/><input className="input" placeholder="WhatsApp" value={leader.phone} onChange={e=>setLeader({...leader,phone:e.target.value})}/><input className="input" placeholder="Cidade" value={leader.city} onChange={e=>setLeader({...leader,city:e.target.value})}/><input className="input" placeholder="UF" value={leader.state} onChange={e=>setLeader({...leader,state:e.target.value.toUpperCase()})}/><input className="input" placeholder="Bairro" value={leader.neighborhood} onChange={e=>setLeader({...leader,neighborhood:e.target.value})}/><input className="input" type="number" placeholder="Meta de contatos" value={leader.target_contacts} onChange={e=>setLeader({...leader,target_contacts:e.target.value})}/><textarea className="textarea full" placeholder="Observações operacionais" value={leader.notes} onChange={e=>setLeader({...leader,notes:e.target.value})}/><label className="check-line"><input type="checkbox" checked={leader.consent_status} onChange={e=>setLeader({...leader,consent_status:e.target.checked})}/> Consentimento de contato</label><button className="btn primary" disabled={busy} onClick={()=>create('public_leaders',{...leader,target_contacts:number(leader.target_contacts)},()=>setLeader({name:'',phone:'',email:'',address:'',neighborhood:'',city:'',state:'PI',target_contacts:'0',notes:'',consent_status:false}))}>Salvar liderança</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Metas da rede</h2><span>{data.leaders.length}</span></div><div className="report-bars">{leaderProgress.map((l:any)=><div className="bar" key={l.id}><span><b>{l.name}</b><small>{l.current}/{l.target_contacts||0}</small></span><i style={{width:`${Math.max(5,pct(l.current,number(l.target_contacts)))}%`}}/></div>)}</div></div>
    </section>}

    {!loading&&(tab==='requests'||tab==='tasks')&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Nova demanda / tarefa pública</summary><div className="form-grid" style={{marginTop:16}}><input className="input full" placeholder="Título" value={request.title} onChange={e=>setRequest({...request,title:e.target.value})}/><select className="select" value={request.contact_id} onChange={e=>setRequest({...request,contact_id:e.target.value})}><option value="">Sem solicitante vinculado</option>{data.contacts.map((c:any)=><option value={c.id} key={c.id}>{c.name}</option>)}</select><select className="select" value={request.priority} onChange={e=>setRequest({...request,priority:e.target.value})}><option>Baixa</option><option>Média</option><option>Alta</option><option>Urgente</option></select><textarea className="textarea full" placeholder="Descrição" value={request.description} onChange={e=>setRequest({...request,description:e.target.value})}/><button className="btn primary" disabled={busy} onClick={()=>create('public_requests',{...request,contact_id:request.contact_id||null},()=>setRequest({title:'',category:'Demanda',description:'',priority:'Média',status:'aberta',contact_id:''}))}>Registrar</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Fila de demandas</h2><span>{requestOpen} abertas</span></div><div className="compact-list">{data.requests.map((r:any)=><div className="compact-row" key={r.id}><div><b>{r.title}</b><small>{r.category} · {r.priority} · {r.status}</small></div>{r.status!=='resolvida'&&<button className="btn small success" onClick={async()=>{await updatePublic('public_requests',r.id,{status:'resolvida',updated_at:new Date().toISOString()});await reload()}}>Resolver</button>}</div>)}{!data.requests.length&&<div className="empty">Nenhuma demanda registrada.</div>}</div></div>
    </section>}

    {!loading&&tab==='events'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Novo evento</summary><div className="form-grid" style={{marginTop:16}}><input className="input full" placeholder="Evento" value={event.title} onChange={e=>setEvent({...event,title:e.target.value})}/><input className="input" placeholder="Cidade" value={event.city} onChange={e=>setEvent({...event,city:e.target.value})}/><input className="input" placeholder="Local" value={event.venue} onChange={e=>setEvent({...event,venue:e.target.value})}/><input className="input" type="datetime-local" value={event.starts_at} onChange={e=>setEvent({...event,starts_at:e.target.value})}/><input className="input" type="number" placeholder="Confirmados" value={event.confirmed_count} onChange={e=>setEvent({...event,confirmed_count:e.target.value})}/><button className="btn primary" disabled={busy} onClick={()=>create('public_events',{...event,confirmed_count:number(event.confirmed_count),ends_at:event.ends_at||null})}>Salvar evento</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Eventos programados</h2><span>{data.events.length}</span></div><div className="compact-list">{data.events.map((r:any)=><div className="compact-row" key={r.id}><div><b>{r.title}</b><small>{dateTime(r.starts_at)} · {r.city}/{r.state} · {r.venue||'sem local'}</small></div><span className="health ok">{r.confirmed_count||0} confirmados</span></div>)}</div></div>
    </section>}

    {!loading&&tab==='agenda'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Novo compromisso</summary><div className="form-grid" style={{marginTop:16}}><input className="input full" placeholder="Compromisso" value={agenda.title} onChange={e=>setAgenda({...agenda,title:e.target.value})}/><select className="select" value={agenda.category} onChange={e=>setAgenda({...agenda,category:e.target.value})}><option>Compromisso</option><option>Entrevista</option><option>Reunião</option><option>Visita</option><option>Evento</option><option>Interno</option></select><input className="input" type="datetime-local" value={agenda.starts_at} onChange={e=>setAgenda({...agenda,starts_at:e.target.value})}/><input className="input" placeholder="Local" value={agenda.venue} onChange={e=>setAgenda({...agenda,venue:e.target.value})}/><input className="input" placeholder="Cidade" value={agenda.city} onChange={e=>setAgenda({...agenda,city:e.target.value})}/><button className="btn primary" disabled={busy} onClick={()=>create('public_agenda',{...agenda,ends_at:agenda.ends_at||null})}>Agendar</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Agenda</h2><span>{data.agenda.length} compromissos</span></div><div className="timeline">{data.agenda.map((r:any)=><div className="timeline-item" key={r.id}><b>{r.title}</b><p>{dateTime(r.starts_at)} · {r.venue||r.city||'local a definir'}</p><span className="health ok">{r.category}</span></div>)}</div></div>
    </section>}

    {!loading&&tab==='geo'&&<section className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>Territórios georreferenciados</h2><span>{geoRows.length}</span></div><select className="select full" value={geo?.id||''} onChange={e=>setSelectedGeo(e.target.value)}><option value="">Selecione</option>{geoRows.map((r:any)=><option key={r.id} value={r.id}>{r.city}/{r.state} · {r.territory_name||'território'}</option>)}</select>{geo?<div className="geo-summary"><b>{geo.city}/{geo.state}</b><span>{geo.latitude}, {geo.longitude}</span><span>Eleitorado agregado: {fmt(geo.electorate_total)}</span></div>:<div className="empty">Cadastre latitude e longitude no território para abrir o mapa.</div>}</div>
      <div className="card pad map-card">{geo?<iframe title="Mapa territorial" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${number(geo.longitude)-0.08}%2C${number(geo.latitude)-0.06}%2C${number(geo.longitude)+0.08}%2C${number(geo.latitude)+0.06}&layer=mapnik&marker=${geo.latitude}%2C${geo.longitude}`}/>:<div className="empty">Mapa aguardando coordenadas.</div>}</div>
      <details className="card pad create-panel full-span"><summary>+ Cadastrar território com coordenadas</summary><div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Cidade" value={territory.city} onChange={e=>setTerritory({...territory,city:e.target.value})}/><input className="input" placeholder="UF" value={territory.state} onChange={e=>setTerritory({...territory,state:e.target.value.toUpperCase()})}/><input className="input" placeholder="Região / território" value={territory.territory_name} onChange={e=>setTerritory({...territory,territory_name:e.target.value})}/><input className="input" type="number" placeholder="Eleitorado agregado" value={territory.electorate_total} onChange={e=>setTerritory({...territory,electorate_total:e.target.value})}/><input className="input" placeholder="Latitude" value={territory.latitude} onChange={e=>setTerritory({...territory,latitude:e.target.value})}/><input className="input" placeholder="Longitude" value={territory.longitude} onChange={e=>setTerritory({...territory,longitude:e.target.value})}/><button className="btn primary" onClick={()=>create('public_territories',{...territory,electorate_total:number(territory.electorate_total)||null,population_total:number(territory.population_total)||null,latitude:number(territory.latitude)||null,longitude:number(territory.longitude)||null,source_date:new Date().toISOString().slice(0,10)})}>Salvar território</button></div></details>
    </section>}

    {!loading&&tab==='communication'&&<section className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>WhatsApp conectado</h2><span>{data.whatsappAccount?.status||'Sem conta'}</span></div><div className="integration-grid"><div><b>Instância</b><small>{data.whatsappAccount?.display_phone_number||'não configurada'}</small><span className={data.whatsappAccount?'health ok':'health warn'}>{data.whatsappAccount?'Ativa':'Atenção'}</span></div><div><b>Base autorizada</b><small>consentimento registrado</small><span className="health ok">{consenting}</span></div></div></div>
      <div className="card pad"><div className="section-title"><h2>Enviar informação</h2><span>um contato autorizado</span></div><select className="select full" value={message.contactId} onChange={e=>setMessage({...message,contactId:e.target.value})}><option value="">Selecione um contato</option>{data.contacts.filter((c:any)=>c.consent_status&&c.phone).map((c:any)=><option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}</select><select className="select full" value={message.purpose} onChange={e=>setMessage({...message,purpose:e.target.value as typeof message.purpose})}><option value="informacao_publica">Informação pública</option><option value="evento">Evento</option><option value="servico">Serviço / atendimento</option></select><textarea className="textarea full" placeholder="Mensagem informativa" value={message.text} onChange={e=>setMessage({...message,text:e.target.value})}/><button className="btn primary" disabled={busy} onClick={sendInfo}>Enviar / registrar no WhatsApp</button><p className="notice">O módulo exige consentimento e finalidade informativa. Não cria segmentação persuasiva por preferência política.</p></div>
    </section>}

    {!loading&&tab==='assets'&&<section className="grid two-col">
      <details className="card pad create-panel" open><summary>Novo veículo / ativo</summary><div className="form-grid" style={{marginTop:16}}><select className="select" value={asset.asset_type} onChange={e=>setAsset({...asset,asset_type:e.target.value})}><option>Veículo</option><option>Equipamento</option><option>Ponto de apoio</option><option>Material</option></select><input className="input" placeholder="Nome / identificação" value={asset.name} onChange={e=>setAsset({...asset,name:e.target.value})}/><input className="input" placeholder="Placa / código" value={asset.identifier} onChange={e=>setAsset({...asset,identifier:e.target.value})}/><input className="input" placeholder="Responsável" value={asset.responsible} onChange={e=>setAsset({...asset,responsible:e.target.value})}/><input className="input" placeholder="Cidade" value={asset.city} onChange={e=>setAsset({...asset,city:e.target.value})}/><button className="btn primary" disabled={busy} onClick={()=>create('public_assets',asset)}>Salvar ativo</button></div></details>
      <div className="card pad"><div className="section-title"><h2>Estrutura de campo</h2><span>{data.assets.length}</span></div><div className="compact-list">{data.assets.map((r:any)=><div className="compact-row" key={r.id}><div><b>{r.name}</b><small>{r.asset_type} · {r.identifier||'sem código'} · {r.city||'sem cidade'}</small></div><span className="health ok">{r.status}</span></div>)}</div></div>
    </section>}

    {!loading&&tab==='simulator'&&<section className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>Simulador agregado</h2><span>cenário matemático</span></div><div className="form-grid"><input className="input full" placeholder="Nome do cenário" value={simulation.name} onChange={e=>setSimulation({...simulation,name:e.target.value})}/><input className="input" type="number" placeholder="Eleitorado total" value={simulation.electorate_total} onChange={e=>setSimulation({...simulation,electorate_total:e.target.value})}/><input className="input" type="number" placeholder="Comparecimento %" value={simulation.turnout_rate} onChange={e=>setSimulation({...simulation,turnout_rate:e.target.value})}/><input className="input" type="number" placeholder="Votos válidos %" value={simulation.valid_vote_rate} onChange={e=>setSimulation({...simulation,valid_vote_rate:e.target.value})}/><input className="input" type="number" placeholder="Percentual de referência %" value={simulation.reference_share} onChange={e=>setSimulation({...simulation,reference_share:e.target.value})}/><button className="btn primary" disabled={busy} onClick={saveSimulation}>Salvar cenário</button></div></div>
      <div className="card pad"><div className="section-title"><h2>Projeção</h2><span>sem perfil individual</span></div><div className="score-grid"><div><strong>{fmt(sim.total)}</strong><span>eleitorado</span></div><div><strong>{fmt(sim.turnout)}</strong><span>comparecimento</span></div><div><strong>{fmt(sim.valid)}</strong><span>válidos</span></div><div><strong>{fmt(sim.reference)}</strong><span>referência matemática</span></div></div><p className="notice">Ferramenta agregada para cenários públicos. Não estima nem registra intenção de voto de pessoas específicas.</p></div>
    </section>}

    {!loading&&tab==='audit'&&<section className="card pad"><div className="section-title"><h2>Auditoria operacional</h2><span>{data.audit.length} eventos recentes</span></div><div className="table-wrap"><table><thead><tr><th>Quando</th><th>Entidade</th><th>Ação</th><th>Origem</th></tr></thead><tbody>{data.audit.map((r:any)=><tr key={r.id}><td>{dateTime(r.created_at)}</td><td>{r.entity_type}</td><td>{r.action}</td><td>{r.metadata?.source||'Público 360'}</td></tr>)}</tbody></table></div></section>}
  </div>;
}
