"use client";

import { useEffect, useState } from 'react';
import { createFinanceInvoice, generateInvoicesFromWonDeals, loadFinanceData, updateFinanceInvoice, type FinanceEntry, type FinanceForm, type FinanceInvoice, type WonDeal } from '@/lib/crm/finance-admin';
import { normalizeRole } from '@/lib/crm/permissions';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

const emptyForm:FinanceForm={customer_name:'',description:'',amount:'',status:'Pendente',due_at:'',paid_at:'',payment_method:'',notes:''};
const statusOptions=['Pendente','Pago','Vencido','Cancelado'];
const methodOptions=['Pix','Cartão','Boleto','Dinheiro','Transferência','Outro'];
const brl=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0));
function date(value?:string|null){if(!value)return'—';const d=new Date(value.length===10?value+'T12:00:00':value);return Number.isNaN(d.getTime())?value:d.toLocaleDateString('pt-BR')}
function contactName(deal:WonDeal){const c=deal.contacts as any;return Array.isArray(c)?c[0]?.name||'Cliente sem nome':c?.name||'Cliente sem nome'}
function canOpen(role?:string|null){return['Admin Empresa','Gestor','Financeiro'].includes(normalizeRole(role))}

export function FinancePage(){
  const [allowed,setAllowed]=useState(false),[checked,setChecked]=useState(false),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const [invoices,setInvoices]=useState<FinanceInvoice[]>([]),[entries,setEntries]=useState<FinanceEntry[]>([]),[wonDeals,setWonDeals]=useState<WonDeal[]>([]);
  const [form,setForm]=useState<FinanceForm>(emptyForm),[filter,setFilter]=useState('Todos');

  async function refresh(){setLoading(true);try{const data=await loadFinanceData();setInvoices(data.invoices);setEntries(data.entries);setWonDeals(data.wonDeals);}catch(e){console.error(e)}finally{setLoading(false)}}
  useEffect(()=>{(async()=>{try{const p=await getCurrentProfile();const ok=canOpen(p?.role);setAllowed(ok);if(ok)await refresh()}finally{setChecked(true)}})()},[]);
  if(!checked||!allowed)return null;

  const today=new Date().toISOString().slice(0,10);
  const normalized=invoices.map(i=>({...i,status:i.status==='Pendente'&&i.due_at&&i.due_at<today?'Vencido':i.status}));
  const visible=normalized.filter(i=>filter==='Todos'||i.status===filter);
  const sold=invoices.reduce((s,i)=>s+Number(i.amount||0),0),received=invoices.filter(i=>i.status==='Pago').reduce((s,i)=>s+Number(i.amount||0),0);
  const open=normalized.filter(i=>i.status==='Pendente').reduce((s,i)=>s+Number(i.amount||0),0),overdue=normalized.filter(i=>i.status==='Vencido').reduce((s,i)=>s+Number(i.amount||0),0);

  async function create(){if(!form.customer_name.trim()||!form.description.trim())return alert('Informe cliente e descrição.');setSaving(true);try{await createFinanceInvoice(form);setForm(emptyForm);await refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao criar recebimento.')}finally{setSaving(false)}}
  async function mark(invoice:FinanceInvoice,status:string){try{await updateFinanceInvoice(invoice.id,{status,due_at:invoice.due_at,paid_at:status==='Pago'?today:invoice.paid_at,payment_method:invoice.payment_method||'Pix',notes:invoice.notes});await refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao atualizar.')}}
  async function generate(){setSaving(true);try{const created=await generateInvoicesFromWonDeals();await refresh();alert(created.length?`${created.length} recebimento(s) criado(s) a partir do pipeline.`:'Todas as vendas ganhas já possuem recebimento.')}catch(e){alert(e instanceof Error?e.message:'Falha ao gerar recebimentos.')}finally{setSaving(false)}}
  function useDeal(deal:WonDeal){setForm({customer_name:contactName(deal),description:deal.title||'Venda ganha',amount:String(Number(deal.value||0)),status:'Pendente',due_at:'',paid_at:'',payment_method:'',notes:'Gerado a partir do pipeline comercial.'})}

  return <div className="workspace-stack finance-workspace">
    <section className="finance-flow card pad"><span>PIPELINE GANHO</span><b>→</b><span>RECEBIMENTO</span><b>→</b><span>BAIXA</span><b>→</b><span>ENTRADA</span><p>O financeiro nasce da venda e fecha o ciclo da receita.</p></section>
    <section className="grid metrics executive-metrics">
      <div className="card metric"><span>Faturado</span><strong>{brl(sold)}</strong><small>títulos criados</small></div>
      <div className="card metric"><span>Recebido</span><strong>{brl(received)}</strong><small>baixas confirmadas</small></div>
      <div className="card metric"><span>Em aberto</span><strong>{brl(open)}</strong><small>pendente</small></div>
      <div className="card metric"><span>Vencido</span><strong>{brl(overdue)}</strong><small>prioridade financeira</small></div>
      <div className="card metric"><span>Vendas ganhas</span><strong>{wonDeals.length}</strong><small>origem no pipeline</small></div>
    </section>

    <div className="toolbar"><div><b>Contas a receber</b><span className="notice">Sincronize as vendas ganhas para não digitar tudo novamente.</span></div><div className="deal-actions"><button className="btn primary" disabled={saving} onClick={generate}>Gerar do pipeline</button><button className="btn" onClick={refresh}>{loading?'Atualizando...':'Atualizar'}</button></div></div>

    <section className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><h2>Recebimentos</h2><span>{visible.length}</span></div><select className="select toolbar-select" value={filter} onChange={e=>setFilter(e.target.value)}><option>Todos</option>{statusOptions.map(s=><option key={s}>{s}</option>)}</select></div>
        <div className="compact-list">{visible.map(i=><div className="finance-row" key={i.id}><div><b>{i.customer_name}</b><small>{i.description} · vence {date(i.due_at)}</small></div><strong>{brl(Number(i.amount||0))}</strong><span className={i.status==='Pago'?'health ok':i.status==='Vencido'?'health danger':'health warn'}>{i.status}</span><div className="deal-actions">{i.status!=='Pago'&&<button className="btn small success" onClick={()=>mark(i,'Pago')}>Receber</button>}<button className="btn small" onClick={()=>mark(i,'Pendente')}>Pendente</button></div></div>)}{!visible.length&&<div className="empty">Nenhum recebimento neste filtro.</div>}</div>
      </div>
      <div className="card pad">
        <div className="section-title"><div><h2>Vendas ainda no fluxo</h2><span>{wonDeals.length}</span></div></div>
        <div className="compact-list">{wonDeals.slice(0,10).map(d=><div className="compact-row" key={d.id}><div><b>{contactName(d)}</b><small>{d.title}</small></div><div><strong>{brl(Number(d.value||0))}</strong><button className="btn small" onClick={()=>useDeal(d)}>Usar</button></div></div>)}{!wonDeals.length&&<div className="empty">Nenhuma venda ganha.</div>}</div>
      </div>
    </section>

    <details className="card pad create-panel">
      <summary>+ Novo recebimento manual</summary>
      <div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Cliente" value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})}/><input className="input" placeholder="Descrição" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input className="input" type="number" min="0" step=".01" placeholder="Valor" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className="input" type="date" value={form.due_at} onChange={e=>setForm({...form,due_at:e.target.value})}/><select className="select" value={form.payment_method} onChange={e=>setForm({...form,payment_method:e.target.value})}><option value="">Método de pagamento</option>{methodOptions.map(m=><option key={m}>{m}</option>)}</select><textarea className="textarea full" placeholder="Observações" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/><button className="btn primary" disabled={saving} onClick={create}>Criar recebimento</button></div>
    </details>

    <section className="card pad"><div className="section-title"><div><h2>Entradas confirmadas</h2><span>{entries.length}</span></div></div><div className="table-wrap"><table><thead><tr><th>Data</th><th>Descrição</th><th>Método</th><th>Valor</th></tr></thead><tbody>{entries.map(e=><tr key={e.id}><td>{date(e.occurred_at)}</td><td>{e.description}</td><td>{e.payment_method||'—'}</td><td>{brl(Number(e.amount||0))}</td></tr>)}</tbody></table></div>{!entries.length&&<div className="empty">Ainda não há entradas baixadas.</div>}</section>
  </div>;
}
