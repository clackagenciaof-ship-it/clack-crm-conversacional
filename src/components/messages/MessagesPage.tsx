import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Badge } from '@/components/ui/Badge';
import { leadStatusBadgeStyle } from '@/lib/crm/badge-styles';
import { createRealQuickMessage, removeRealQuickMessage, toggleRealQuickMessage, updateRealQuickMessage } from '@/lib/crm/message-persistence';
import type { QuickMessage } from '@/types/crm';

type MessageForm={title:string;category:string;text:string};
type Props={messages:QuickMessage[];setMessages:Dispatch<SetStateAction<QuickMessage[]>>;copyMessage:(message:QuickMessage)=>void;demoMode?:boolean};
const categories=['Boas-vindas','Primeiro contato','Retorno','Fechamento','Pós-venda','Suporte','Cobrança'];

export function MessagesPage({messages,setMessages,copyMessage,demoMode=false}:Props){
  const [form,setForm]=useState<MessageForm>({title:'',category:'Boas-vindas',text:''});
  const [filter,setFilter]=useState('Todas');
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editForm,setEditForm]=useState<MessageForm|null>(null);
  const visible=useMemo(()=>messages.filter(m=>filter==='Todas'||m.category===filter),[messages,filter]);

  async function add(){
    if(!form.title.trim()||!form.text.trim())return alert('Preencha título e texto.');
    if(demoMode){setMessages(current=>[{id:Date.now(),...form,active:true},...current]);setForm({title:'',category:'Boas-vindas',text:''});return;}
    try{
      const saved=await createRealQuickMessage(form,messages.length);
      if(!saved)throw new Error('Mensagem não persistida.');
      setMessages(current=>[saved,...current]);setForm({title:'',category:'Boas-vindas',text:''});
    }catch(error){console.error(error);alert('Não foi possível salvar no banco real. Nenhum modelo local foi criado.');}
  }

  async function toggle(message:QuickMessage){
    if(demoMode){setMessages(current=>current.map(m=>m.id===message.id?{...m,active:!m.active}:m));return;}
    try{const saved=await toggleRealQuickMessage(message,messages.findIndex(m=>m.id===message.id)+1);if(!saved)throw new Error('Não persistido');setMessages(current=>current.map(m=>m.id===message.id?saved:m));}
    catch(error){console.error(error);alert('Não foi possível alterar o modelo no banco real.');}
  }

  async function save(message:QuickMessage){
    if(!editForm?.title.trim()||!editForm.text.trim())return alert('Preencha título e texto.');
    if(demoMode){setMessages(current=>current.map(m=>m.id===message.id?{...m,...editForm}:m));setEditingId(null);setEditForm(null);return;}
    try{const saved=await updateRealQuickMessage(message,{...editForm,active:message.active},messages.findIndex(m=>m.id===message.id)+1);if(!saved)throw new Error('Não persistido');setMessages(current=>current.map(m=>m.id===message.id?saved:m));setEditingId(null);setEditForm(null);}
    catch(error){console.error(error);alert('Não foi possível editar o modelo no banco real.');}
  }

  async function remove(message:QuickMessage){
    if(!window.confirm(`Excluir o modelo "${message.title}"?`))return;
    if(!demoMode){try{await removeRealQuickMessage(message);}catch(error){console.error(error);return alert('Não foi possível excluir do banco real.');}}
    setMessages(current=>current.filter(m=>m.id!==message.id));
  }

  return <div className="workspace-stack">
    <div className="toolbar"><div><b>Biblioteca de comunicação</b><span className="notice">Modelos usados no atendimento e nas jornadas.</span></div><select className="select toolbar-select" value={filter} onChange={e=>setFilter(e.target.value)}><option>Todas</option>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
    <details className="card pad create-panel"><summary>+ Criar modelo</summary><div className="form-grid" style={{marginTop:16}}><input className="input" placeholder="Nome do modelo" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/><select className="select" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select><textarea className="textarea full" placeholder="Mensagem" value={form.text} onChange={e=>setForm({...form,text:e.target.value})}/><button className="btn primary" onClick={add}>Salvar modelo</button></div></details>
    <section className="card pad">
      <div className="section-title"><div><h2>Modelos ativos e históricos</h2><span>{visible.length}</span></div></div>
      <div className="template-grid">
        {visible.map(message=><article className="message-card template-card" key={message.id}>
          {editingId===message.id&&editForm?<div className="form-grid"><input className="input full" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})}/><select className="select full" value={editForm.category} onChange={e=>setEditForm({...editForm,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select><textarea className="textarea full" value={editForm.text} onChange={e=>setEditForm({...editForm,text:e.target.value})}/><button className="btn small primary" onClick={()=>save(message)}>Salvar</button><button className="btn small" onClick={()=>{setEditingId(null);setEditForm(null)}}>Cancelar</button></div>:<>
            <div className="section-title"><div><h2>{message.title}</h2><span>{message.category}</span></div><Badge style={leadStatusBadgeStyle(message.active?'Cliente':'Inativo')}>{message.active?'Ativa':'Inativa'}</Badge></div>
            <p>{message.text}</p>
            <div className="deal-actions"><button className="btn small primary" onClick={()=>copyMessage(message)}>Copiar</button><button className="btn small" onClick={()=>{setEditingId(message.id);setEditForm({title:message.title,category:message.category,text:message.text})}}>Editar</button><button className="btn small" onClick={()=>toggle(message)}>{message.active?'Inativar':'Ativar'}</button><button className="btn small danger" onClick={()=>remove(message)}>Excluir</button></div>
          </>}
        </article>)}
        {!visible.length&&<div className="empty">Nenhum modelo. Contas novas não recebem mensagens fictícias; crie os modelos da empresa quando precisar.</div>}
      </div>
    </section>
  </div>;
}
