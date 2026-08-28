"use client";

import { formatCurrencyBRL as brl } from '@/lib/crm/formatters';
import type { Lead, Opportunity, Task } from '@/types/crm';

type Props={leads:Lead[];deals:Opportunity[];tasks:Task[]};
const pct=(v:number)=>`${Math.round(v)}%`;

function probability(deal:Opportunity){if(typeof deal.probability==='number')return deal.probability;if(deal.status==='Ganha')return 100;if(deal.status==='Perdida')return 0;return 30}

export function ReportsPage({leads,deals,tasks}:Props){
  const won=deals.filter(d=>d.status==='Ganha'),lost=deals.filter(d=>d.status==='Perdida'),open=deals.filter(d=>d.status==='Aberta');
  const sold=won.reduce((s,d)=>s+Number(d.value||0),0),openValue=open.reduce((s,d)=>s+Number(d.value||0),0);
  const forecast=open.reduce((s,d)=>s+Number(d.value||0)*probability(d)/100,0);
  const conversion=deals.length?won.length/deals.length*100:0,ticket=won.length?sold/won.length:0;
  const completed=tasks.filter(t=>t.status==='Concluída').length,taskRate=tasks.length?completed/tasks.length*100:0;
  const sourceMap=leads.reduce<Record<string,number>>((acc,l)=>{const k=l.source||'Não informado';acc[k]=(acc[k]||0)+1;return acc},{});
  const sources=Object.entries(sourceMap).sort((a,b)=>b[1]-a[1]),sourceMax=Math.max(...sources.map(([,v])=>v),1);
  const stages=Object.entries(deals.reduce<Record<string,{count:number,value:number}>>((acc,d)=>{const k=d.stage||'Sem etapa';acc[k]=acc[k]||{count:0,value:0};acc[k].count++;acc[k].value+=Number(d.value||0);return acc},{}));
  const stageMax=Math.max(...stages.map(([,v])=>v.value),1);
  const owners=Object.values(deals.reduce<Record<string,{name:string,total:number,won:number,value:number}>>((acc,d)=>{const k=d.owner||'Equipe';acc[k]=acc[k]||{name:k,total:0,won:0,value:0};acc[k].total++;if(d.status==='Ganha'){acc[k].won++;acc[k].value+=Number(d.value||0)}return acc},{})).sort((a,b)=>b.value-a.value);

  return <div className="workspace-stack report-document">
    <section className="card pad report-header"><div><span className="one-kicker">CLACK ONE · RELATÓRIO EXECUTIVO</span><h2>Vendas, atendimento e execução</h2><p>Dados atuais da empresa. Gere uma versão para apresentação pelo navegador.</p></div><button className="btn primary no-print" onClick={()=>window.print()}>Imprimir / Salvar em PDF</button></section>

    <section className="grid metrics executive-metrics">
      <div className="card metric"><span>Valor vendido</span><strong>{brl(sold)}</strong><small>{won.length} venda(s)</small></div>
      <div className="card metric"><span>Em negociação</span><strong>{brl(openValue)}</strong><small>{open.length} aberta(s)</small></div>
      <div className="card metric"><span>Forecast</span><strong>{brl(forecast)}</strong><small>ponderado</small></div>
      <div className="card metric"><span>Conversão</span><strong>{pct(conversion)}</strong><small>{won.length}/{deals.length}</small></div>
      <div className="card metric"><span>Ticket médio</span><strong>{brl(ticket)}</strong><small>ganhas</small></div>
      <div className="card metric"><span>Execução</span><strong>{pct(taskRate)}</strong><small>{completed}/{tasks.length} tarefas</small></div>
    </section>

    <section className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>Origem dos contatos</h2><span>captação</span></div><div className="report-bars">{sources.map(([name,value])=><div className="bar" key={name}><span><b>{name}</b><small>{value}</small></span><i style={{width:`${Math.max(8,(value/sourceMax)*100)}%`}}/></div>)}{!sources.length&&<div className="empty">Sem dados de captação.</div>}</div></div>
      <div className="card pad"><div className="section-title"><h2>Pipeline por etapa</h2><span>valor</span></div><div className="report-bars">{stages.map(([name,value])=><div className="bar" key={name}><span><b>{name}</b><small>{brl(value.value)} · {value.count}</small></span><i style={{width:`${Math.max(8,(value.value/stageMax)*100)}%`}}/></div>)}</div></div>
    </section>

    <section className="grid two-col">
      <div className="card pad"><div className="section-title"><h2>Performance por responsável</h2><span>negócios ganhos</span></div><div className="table-wrap"><table><thead><tr><th>Responsável</th><th>Oportunidades</th><th>Ganhas</th><th>Valor</th></tr></thead><tbody>{owners.map(o=><tr key={o.name}><td>{o.name}</td><td>{o.total}</td><td>{o.won}</td><td>{brl(o.value)}</td></tr>)}</tbody></table></div></div>
      <div className="card pad"><div className="section-title"><h2>Leitura executiva</h2><span>ação</span></div><div className="timeline"><div className="timeline-item"><b>Receita</b><p>{open.length} oportunidade(s) em aberto somam {brl(openValue)}; forecast atual de {brl(forecast)}.</p></div><div className="timeline-item"><b>Risco</b><p>{tasks.filter(t=>t.status==='Vencida').length} tarefa(s) vencidas e {lost.length} negócio(s) perdidos.</p></div><div className="timeline-item"><b>Captação</b><p>{sources[0]?`${sources[0][0]} lidera a entrada com ${sources[0][1]} contato(s).`:'Base ainda sem origem registrada.'}</p></div></div></div>
    </section>
  </div>;
}
