"use client";

import { useEffect, useMemo, useState } from 'react';
import { suggestWithAIAgent } from '@/lib/crm/ai-agent-client';
import { createSupabaseBrowserClient, getFreshAccessToken } from '@/lib/supabase/client';
import { getCurrentProfile, listCompanyProfiles, listQuickMessages, listWhatsAppConversations, listWhatsAppMessages, type ProfileRow } from '@/lib/supabase/crm-repository';
import { loadChatbotFlows, runFlowSequence, type ChatbotFlow } from '@/lib/crm/flow-admin';

type Conversa={id:string;contact_id?:string|null;customer_name:string|null;customer_phone:string;status:string;priority?:string;channel?:string;assigned_to?:string|null;last_message_at:string|null};
type Mensagem={id:string;direction:string;body:string|null;status:string;created_at:string};
type Quick={id:string;title:string;category:string;content:string;active:boolean};
const statusOptions=['Aberta','Em atendimento','Resolvida','Arquivada'];
const priorityOptions=['Baixa','Normal','Alta','Urgente'];

function fmt(value?:string|null){if(!value)return'—';const d=new Date(value);return Number.isNaN(d.getTime())?value:d.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}

export function AtendimentoPage(){
  const [companyId,setCompanyId]=useState<string|null>(null);
  const [profile,setProfile]=useState<ProfileRow|null>(null);
  const [team,setTeam]=useState<ProfileRow[]>([]);
  const [quick,setQuick]=useState<Quick[]>([]);
  const [flows,setFlows]=useState<ChatbotFlow[]>([]);
  const [conversations,setConversations]=useState<Conversa[]>([]);
  const [selected,setSelected]=useState<Conversa|null>(null);
  const [messages,setMessages]=useState<Mensagem[]>([]);
  const [reply,setReply]=useState('');
  const [statusFilter,setStatusFilter]=useState('Ativas');
  const [ownerFilter,setOwnerFilter]=useState('Todos');
  const [priorityFilter,setPriorityFilter]=useState('Todas');
  const [transferTo,setTransferTo]=useState('');
  const [flowId,setFlowId]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [lastRefresh,setLastRefresh]=useState<string|null>(null);
  const [operationNotice,setOperationNotice]=useState('');

  async function token(){
    return getFreshAccessToken();
  }
  function memberName(id?:string|null){return id?team.find(m=>m.id===id)?.name||'Equipe':'Sem responsável'}

  async function loadInbox(silent=false){
    if(!silent)setLoading(true);
    try{
      const current=await getCurrentProfile();
      if(!current?.company_id)return;
      setCompanyId(current.company_id);setProfile(current);
      const [conv,people,models,flowData]=await Promise.all([
        listWhatsAppConversations(current.company_id),
        listCompanyProfiles(current.company_id),
        listQuickMessages(current.company_id),
        loadChatbotFlows().catch(()=>({flows:[],steps:[]}))
      ]);
      const rows=(conv||[]) as Conversa[];
      setConversations(rows);
      setTeam((people||[]).filter((m:ProfileRow)=>m.status==='active'));
      setQuick((models||[]).filter((m:any)=>m.active));
      setFlows((flowData.flows||[]).filter((f:ChatbotFlow)=>f.active));
      setSelected(old=>rows.find(r=>r.id===old?.id)||rows[0]||null);
      setLastRefresh(new Date().toISOString());
    }catch(error){console.error(error);setOperationNotice('Não foi possível atualizar a fila agora.');}
    finally{if(!silent)setLoading(false)}
  }

  async function loadMessages(conversation:Conversa){
    if(!companyId)return;
    try{setMessages((await listWhatsAppMessages(companyId,conversation.id)) as Mensagem[]);}
    catch(error){console.error(error);setOperationNotice('Não foi possível carregar o histórico.');}
  }

  useEffect(()=>{loadInbox()},[]);
  useEffect(()=>{if(selected&&companyId)loadMessages(selected)},[selected?.id,companyId]);
  useEffect(()=>{
    if(!companyId)return;
    const supabase=createSupabaseBrowserClient() as any;
    const channel=supabase?.channel?.(`clack-inbox-${companyId}`)
      ?.on('postgres_changes',{event:'*',schema:'public',table:'whatsapp_conversations',filter:`company_id=eq.${companyId}`},()=>loadInbox(true))
      ?.on('postgres_changes',{event:'*',schema:'public',table:'whatsapp_messages',filter:`company_id=eq.${companyId}`},()=>{loadInbox(true);if(selected)loadMessages(selected)})
      ?.subscribe();
    const timer=window.setInterval(()=>loadInbox(true),30000);
    return()=>{window.clearInterval(timer);if(channel)supabase?.removeChannel?.(channel)};
  },[companyId,selected?.id]);

  const filtered=useMemo(()=>conversations.filter(c=>{
    const statusOk=statusFilter==='Todas'||(statusFilter==='Ativas'?['Aberta','Em atendimento'].includes(c.status):c.status===statusFilter);
    const ownerOk=ownerFilter==='Todos'||(ownerFilter==='Sem responsável'?!c.assigned_to:c.assigned_to===ownerFilter);
    const priorityOk=priorityFilter==='Todas'||(c.priority||'Normal')===priorityFilter;
    return statusOk&&ownerOk&&priorityOk;
  }),[conversations,statusFilter,ownerFilter,priorityFilter]);

  const stats={
    open:conversations.filter(c=>c.status==='Aberta').length,
    active:conversations.filter(c=>c.status==='Em atendimento').length,
    unassigned:conversations.filter(c=>c.status==='Aberta'&&!c.assigned_to).length,
    resolved:conversations.filter(c=>c.status==='Resolvida').length
  };

  async function update(payload:{status?:string;assignedTo?:string|null;priority?:string},notice?:string){
    if(!selected)return;
    setBusy(true);
    try{
      const response=await fetch('/api/atendimento/update',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify({conversationId:selected.id,...payload})});
      const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Falha ao atualizar.');
      setSelected(result.conversation);setConversations(current=>current.map(c=>c.id===result.conversation.id?result.conversation:c));
      if(notice)setOperationNotice(notice);
    }catch(error){setOperationNotice(error instanceof Error?error.message:'Falha ao atualizar atendimento.')}
    finally{setBusy(false)}
  }

  async function send(textOverride?:string){
    if(!selected)return alert('Selecione uma conversa.');
    const text=(textOverride??reply).trim();if(!text)return;
    setBusy(true);
    try{
      const response=await fetch('/api/whatsapp/send',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await token()}`},body:JSON.stringify({conversationId:selected.id,contactId:selected.contact_id||null,toPhone:selected.customer_phone,text})});
      const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'Falha ao enviar.');
      setReply('');await loadMessages(selected);await loadInbox(true);
      setOperationNotice(result.sent?'Mensagem enviada pelo WhatsApp.':'Mensagem registrada, mas o provedor não confirmou envio.');
    }catch(error){setOperationNotice(error instanceof Error?error.message:'Falha ao enviar mensagem.')}
    finally{setBusy(false)}
  }

  async function runFlow(){
    if(!selected||!flowId)return;
    setBusy(true);
    try{const result=await runFlowSequence({conversationId:selected.id,flowId,mode:'start'});await loadMessages(selected);await loadInbox(true);setOperationNotice(result.message||'Fluxo executado.');}
    catch(error){setOperationNotice(error instanceof Error?error.message:'Falha ao executar fluxo.')}
    finally{setBusy(false)}
  }

  async function suggest(){
    if(!selected)return;
    const last=[...messages].reverse().find(m=>m.direction==='inbound')?.body||'Cliente pediu atendimento.';
    setBusy(true);
    try{const suggestion=await suggestWithAIAgent({context:`Atendimento de ${selected.customer_name||selected.customer_phone}`,customer_message:last,goal:'Responder com clareza e conduzir ao próximo passo'});setReply(suggestion);setOperationNotice('Sugestão do Will pronta para revisão.');}
    catch(error){setOperationNotice(error instanceof Error?error.message:'Falha ao gerar sugestão.')}
    finally{setBusy(false)}
  }

  return <div className="workspace-stack inbox-workspace">
    <section className="grid metrics compact-metrics">
      <div className="card metric"><span>Aguardando</span><strong>{stats.open}</strong><small>{stats.unassigned} sem responsável</small></div>
      <div className="card metric"><span>Em atendimento</span><strong>{stats.active}</strong><small>em andamento</small></div>
      <div className="card metric"><span>Resolvidas</span><strong>{stats.resolved}</strong><small>histórico</small></div>
      <div className="card metric"><span>Atualização</span><strong>{lastRefresh?fmt(lastRefresh):'—'}</strong><small>realtime + 30s contingência</small></div>
    </section>

    {operationNotice&&<div className="operation-notice">{operationNotice}<button onClick={()=>setOperationNotice('')}>×</button></div>}

    <div className="inbox-layout">
      <section className="card inbox-list">
        <div className="inbox-toolbar">
          <div><h2>Fila</h2><small>{filtered.length} conversa(s)</small></div>
          <button className="btn small" onClick={()=>loadInbox()}>Atualizar</button>
        </div>
        <div className="inbox-filters">
          <select className="select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}><option>Ativas</option><option>Todas</option>{statusOptions.map(s=><option key={s}>{s}</option>)}</select>
          <select className="select" value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}><option>Todos</option><option>Sem responsável</option>{team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <select className="select" value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)}><option>Todas</option>{priorityOptions.map(p=><option key={p}>{p}</option>)}</select>
        </div>
        <div className="conversation-list">
          {filtered.map(c=><button key={c.id} className={selected?.id===c.id?'conversation-item active':'conversation-item'} onClick={()=>setSelected(c)}>
            <div><b>{c.customer_name||c.customer_phone}</b><small>{c.customer_phone}</small></div>
            <div><span className={c.status==='Aberta'?'health warn':'health ok'}>{c.status}</span><small>{memberName(c.assigned_to)}</small></div>
          </button>)}
          {!filtered.length&&<div className="empty">Nenhuma conversa para este filtro.</div>}
        </div>
      </section>

      <section className="card inbox-detail">
        {!selected?<div className="empty">Selecione uma conversa.</div>:<>
          <div className="inbox-toolbar">
            <div><h2>{selected.customer_name||'Contato'}</h2><small>{selected.customer_phone} · {memberName(selected.assigned_to)}</small></div>
            <div className="deal-actions"><button className="btn small" disabled={busy||!profile} onClick={()=>update({assignedTo:profile?.id||null,status:'Em atendimento'},'Conversa assumida.')}>Assumir</button><button className="btn small success" disabled={busy} onClick={()=>update({status:'Resolvida'},'Conversa resolvida.')}>Resolver</button></div>
          </div>

          <div className="conversation-controls">
            <select className="select" value={selected.status} onChange={e=>update({status:e.target.value})}>{statusOptions.map(s=><option key={s}>{s}</option>)}</select>
            <select className="select" value={selected.priority||'Normal'} onChange={e=>update({priority:e.target.value})}>{priorityOptions.map(p=><option key={p}>{p}</option>)}</select>
            <select className="select" value={transferTo} onChange={e=>setTransferTo(e.target.value)}><option value="">Transferir para...</option>{team.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>
            <button className="btn small" disabled={!transferTo||busy} onClick={()=>update({assignedTo:transferTo,status:'Em atendimento'},'Conversa transferida.')}>Transferir</button>
          </div>

          <div className="message-history">
            {messages.map(m=><div key={m.id} className={m.direction==='inbound'?'bubble inbound':'bubble outbound'}><p>{m.body||'Mensagem sem texto'}</p><small>{fmt(m.created_at)} · {m.status}</small></div>)}
            {!messages.length&&<div className="empty">Sem mensagens nesta conversa.</div>}
          </div>

          <div className="reply-panel">
            <textarea className="textarea" placeholder="Escreva a resposta..." value={reply} onChange={e=>setReply(e.target.value)}/>
            <div className="reply-actions"><button className="btn" disabled={busy} onClick={suggest}>Will sugerir</button><button className="btn primary" disabled={busy||!reply.trim()} onClick={()=>send()}>{busy?'Processando...':'Enviar'}</button></div>
          </div>

          <details className="assist-panel">
            <summary>Modelos e automações</summary>
            <div className="assist-grid">
              <div><b>Mensagens rápidas</b><div className="chip-list">{quick.slice(0,12).map(m=><button key={m.id} onClick={()=>setReply(m.content)}>{m.title}</button>)}</div></div>
              <div><b>Fluxos ativos</b><div className="flow-row"><select className="select" value={flowId} onChange={e=>setFlowId(e.target.value)}><option value="">Selecionar fluxo...</option>{flows.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select><button className="btn small" disabled={!flowId||busy} onClick={runFlow}>Executar</button></div></div>
            </div>
          </details>
        </>}
      </section>
    </div>
  </div>;
}
