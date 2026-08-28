"use client";

import { useEffect, useMemo, useState } from 'react';
import { archiveProduct, deleteProduct, loadProducts, saveProduct, type ProductForm, type ProductService, type ProductStat } from '@/lib/crm/products-client';

const emptyForm:ProductForm={name:'',category:'Serviço',description:'',price:'',billing_type:'Único',status:'Ativo',tags:''};
const categories=['Serviço','Software','Consultoria','Plano mensal','Produto físico','Treinamento','Automação'];
const billingTypes=['Único','Mensal','Anual','Projeto','Recorrente'];
const brl=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(value||0));

export function ProductsPage(){
  const [products,setProducts]=useState<ProductService[]>([]);
  const [stats,setStats]=useState<ProductStat[]>([]);
  const [canManage,setCanManage]=useState(false);
  const [form,setForm]=useState<ProductForm>(emptyForm);
  const [editingId,setEditingId]=useState<string|null>(null);
  const [filter,setFilter]=useState('');
  const [category,setCategory]=useState('Todas');
  const [status,setStatus]=useState('Ativos');
  const [busy,setBusy]=useState(false);

  async function refresh(){setBusy(true);try{const data=await loadProducts();setProducts(data.products);setStats(data.stats);setCanManage(data.canManage);}catch(e){alert(e instanceof Error?e.message:'Falha ao carregar catálogo.')}finally{setBusy(false)}}
  useEffect(()=>{refresh()},[]);

  const visible=useMemo(()=>products.filter(p=>(status==='Todos'||(status==='Ativos'?p.status==='Ativo':p.status!=='Ativo'))&&(category==='Todas'||p.category===category)&&(!filter||p.name.toLowerCase().includes(filter.toLowerCase())||(p.description||'').toLowerCase().includes(filter.toLowerCase()))),[products,status,category,filter]);
  const active=products.filter(p=>p.status==='Ativo');
  const statFor=(id:string)=>stats.find(s=>s.product_id===id)||{product_id:id,opportunities:0,open_value:0,won_value:0,invoiced_value:0};
  const metrics={active:active.length,recurring:active.filter(p=>['Mensal','Recorrente','Anual'].includes(p.billing_type)).length,open:stats.reduce((s,r)=>s+r.open_value,0),won:stats.reduce((s,r)=>s+r.won_value,0),invoiced:stats.reduce((s,r)=>s+r.invoiced_value,0)};

  function edit(p:ProductService){setEditingId(p.id);setForm({name:p.name,category:p.category,description:p.description||'',price:String(p.price||''),billing_type:p.billing_type,status:p.status,tags:(p.tags||[]).join(', ')})}
  async function save(){if(!form.name.trim())return alert('Informe o nome.');setBusy(true);try{await saveProduct(form,editingId||undefined);setEditingId(null);setForm(emptyForm);await refresh();}catch(e){alert(e instanceof Error?e.message:'Falha ao salvar.')}finally{setBusy(false)}}
  async function archive(id:string){try{await archiveProduct(id);await refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao arquivar.')}}
  async function remove(id:string){if(!confirm('Excluir definitivamente este item?'))return;try{await deleteProduct(id);await refresh()}catch(e){alert(e instanceof Error?e.message:'Falha ao excluir.')}}

  return <div className="workspace-stack">
    <section className="grid metrics executive-metrics">
      <div className="card metric"><span>Ofertas ativas</span><strong>{metrics.active}</strong><small>catálogo comercial</small></div>
      <div className="card metric"><span>Recorrentes</span><strong>{metrics.recurring}</strong><small>mensal/anual</small></div>
      <div className="card metric"><span>Em negociação</span><strong>{brl(metrics.open)}</strong><small>oportunidades ligadas</small></div>
      <div className="card metric"><span>Vendido</span><strong>{brl(metrics.won)}</strong><small>negócios ganhos</small></div>
      <div className="card metric"><span>Faturado</span><strong>{brl(metrics.invoiced)}</strong><small>financeiro ligado</small></div>
    </section>
    <div className="toolbar"><div><b>Catálogo da empresa</b><span className="notice">Uma fonte para venda, IA, proposta e financeiro.</span></div><button className="btn small" onClick={refresh}>{busy?'Atualizando...':'Atualizar'}</button></div>
    <div className="catalog-filters"><input className="input" placeholder="Buscar oferta..." value={filter} onChange={e=>setFilter(e.target.value)}/><select className="select" value={category} onChange={e=>setCategory(e.target.value)}><option>Todas</option>{Array.from(new Set(products.map(p=>p.category))).map(c=><option key={c}>{c}</option>)}</select><select className="select" value={status} onChange={e=>setStatus(e.target.value)}><option>Ativos</option><option>Inativos</option><option>Todos</option></select></div>
    {canManage&&<details className="card pad create-panel"><summary>{editingId?'Editar oferta':'+ Nova oferta'}</summary><div className="form-grid" style={{marginTop:16}}><input className="input full" placeholder="Nome do produto ou serviço" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><select className="select" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select><select className="select" value={form.billing_type} onChange={e=>setForm({...form,billing_type:e.target.value})}>{billingTypes.map(c=><option key={c}>{c}</option>)}</select><input className="input" type="number" min="0" step=".01" placeholder="Preço" value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/><select className="select" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Ativo</option><option>Inativo</option></select><textarea className="textarea full" placeholder="Descrição de venda" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/><input className="input full" placeholder="Tags separadas por vírgula" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/><button className="btn primary" disabled={busy} onClick={save}>{editingId?'Salvar edição':'Criar oferta'}</button>{editingId&&<button className="btn" onClick={()=>{setEditingId(null);setForm(emptyForm)}}>Cancelar</button>}</div></details>}
    <section className="catalog-grid">
      {visible.map(p=>{const s=statFor(p.id);return <article className="card catalog-card" key={p.id}><div className="catalog-head"><div><span className="one-kicker">{p.category}</span><h2>{p.name}</h2></div><span className={p.status==='Ativo'?'health ok':'health warn'}>{p.status}</span></div><p>{p.description||'Sem descrição cadastrada.'}</p><strong className="catalog-price">{brl(Number(p.price||0))}<small> · {p.billing_type}</small></strong><div className="catalog-stats"><span><b>{s.opportunities}</b> oportunidades</span><span><b>{brl(s.open_value)}</b> aberto</span><span><b>{brl(s.won_value)}</b> vendido</span></div>{p.tags?.length?<div className="chip-list">{p.tags.map(t=><span key={t}>{t}</span>)}</div>:null}{canManage&&<div className="deal-actions"><button className="btn small" onClick={()=>edit(p)}>Editar</button><button className="btn small" onClick={()=>archive(p.id)}>Arquivar</button><button className="btn small danger" onClick={()=>remove(p.id)}>Excluir</button></div>}</article>})}
      {!visible.length&&<div className="card pad empty">Nenhuma oferta encontrada. Cadastre o catálogo real da empresa.</div>}
    </section>
  </div>;
}
