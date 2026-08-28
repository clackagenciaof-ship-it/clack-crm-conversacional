import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS } from '@/lib/crm/constants';
import { taskStatusBadgeStyle } from '@/lib/crm/badge-styles';
import type { Lead, Task, TaskPriority, TaskStatus } from '@/types/crm';

type TaskForm = { title: string; leadId: number; owner: string; type: string; priority: TaskPriority; due: string; };
type TaskEditForm = TaskForm & { status: TaskStatus; };
type TasksPageProps = { tasks: Task[]; leads: Lead[]; taskForm: TaskForm; setTaskForm: (form: TaskForm) => void; addTask: () => void; completeTask: (taskId: number) => void; updateTaskItem: (task: Task, form: TaskEditForm) => void | Promise<void>; removeTask: (taskId: number) => void | Promise<void>; };

const users = CRM_USERS.map((user) => user.name);
const taskTypes = ['Ligar', 'Enviar mensagem', 'Reunião', 'Enviar proposta', 'Cobrar retorno', 'Pós-venda', 'Outro'];
const statuses: TaskStatus[] = ['Pendente', 'Em andamento', 'Concluída', 'Vencida', 'Cancelada'];
const makeEdit = (task: Task): TaskEditForm => ({ title:task.title,leadId:task.leadId,owner:task.owner,type:task.type,priority:task.priority,due:task.due,status:task.status });

export function TasksPage({ tasks, leads, taskForm, setTaskForm, addTask, completeTask, updateTaskItem, removeTask }: TasksPageProps) {
  const [filter,setFilter]=useState<'pendentes'|'vencidas'|'concluidas'|'todas'>('pendentes');
  const [editingId,setEditingId]=useState<number|null>(null);
  const [editForm,setEditForm]=useState<TaskEditForm|null>(null);
  const visible=useMemo(() => tasks.filter((task) => {
    if(filter==='todas') return true;
    if(filter==='vencidas') return task.status==='Vencida';
    if(filter==='concluidas') return task.status==='Concluída';
    return !['Concluída','Cancelada'].includes(task.status);
  }),[tasks,filter]);
  const leadName=(task:Task)=>task.leadName||leads.find(l=>l.id===task.leadId)?.name||'Sem contato';

  async function save(task:Task){if(!editForm?.title.trim())return alert('A tarefa precisa de título.');await updateTaskItem(task,editForm);setEditingId(null);setEditForm(null)}
  async function remove(id:number){if(window.confirm('Excluir esta tarefa?'))await removeTask(id)}

  return <div className="workspace-stack">
    <div className="toolbar">
      <div><b>Fila de execução</b><span className="notice">{tasks.filter(t=>!['Concluída','Cancelada'].includes(t.status)).length} pendências ativas</span></div>
      <div className="segmented">
        <button className={filter==='pendentes'?'active':''} onClick={()=>setFilter('pendentes')}>Pendentes</button>
        <button className={filter==='vencidas'?'active':''} onClick={()=>setFilter('vencidas')}>Vencidas</button>
        <button className={filter==='concluidas'?'active':''} onClick={()=>setFilter('concluidas')}>Concluídas</button>
        <button className={filter==='todas'?'active':''} onClick={()=>setFilter('todas')}>Todas</button>
      </div>
    </div>

    <details className="card pad create-panel">
      <summary>+ Nova tarefa</summary>
      <div className="form-grid" style={{marginTop:16}}>
        <input className="input full" placeholder="O que precisa ser feito?" value={taskForm.title} onChange={e=>setTaskForm({...taskForm,title:e.target.value})}/>
        <select className="select" value={taskForm.leadId} onChange={e=>setTaskForm({...taskForm,leadId:Number(e.target.value)})}><option value={0}>Sem contato</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
        <select className="select" value={taskForm.owner} onChange={e=>setTaskForm({...taskForm,owner:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select>
        <select className="select" value={taskForm.type} onChange={e=>setTaskForm({...taskForm,type:e.target.value})}>{taskTypes.map(t=><option key={t}>{t}</option>)}</select>
        <select className="select" value={taskForm.priority} onChange={e=>setTaskForm({...taskForm,priority:e.target.value as TaskPriority})}><option>Baixa</option><option>Média</option><option>Alta</option></select>
        <input className="input" placeholder="Prazo: ex. 28/08 18:00" value={taskForm.due} onChange={e=>setTaskForm({...taskForm,due:e.target.value})}/>
        <button className="btn primary" onClick={addTask}>Criar e acompanhar</button>
      </div>
    </details>

    <section className="card pad">
      <div className="section-title"><div><h2>Tarefas</h2><span>{visible.length} neste filtro</span></div></div>
      <div className="compact-list">
        {visible.map(task=><div className="task-row" key={task.id}>
          {editingId===task.id&&editForm?<div className="form-grid full-row">
            <input className="input full" value={editForm.title} onChange={e=>setEditForm({...editForm,title:e.target.value})}/>
            <select className="select" value={editForm.leadId} onChange={e=>setEditForm({...editForm,leadId:Number(e.target.value)})}><option value={0}>Sem contato</option>{leads.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>
            <select className="select" value={editForm.owner} onChange={e=>setEditForm({...editForm,owner:e.target.value})}>{users.map(u=><option key={u}>{u}</option>)}</select>
            <select className="select" value={editForm.type} onChange={e=>setEditForm({...editForm,type:e.target.value})}>{taskTypes.map(t=><option key={t}>{t}</option>)}</select>
            <select className="select" value={editForm.priority} onChange={e=>setEditForm({...editForm,priority:e.target.value as TaskPriority})}><option>Baixa</option><option>Média</option><option>Alta</option></select>
            <select className="select" value={editForm.status} onChange={e=>setEditForm({...editForm,status:e.target.value as TaskStatus})}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
            <input className="input" value={editForm.due} onChange={e=>setEditForm({...editForm,due:e.target.value})}/>
            <button className="btn small primary" onClick={()=>save(task)}>Salvar</button><button className="btn small" onClick={()=>{setEditingId(null);setEditForm(null)}}>Cancelar</button>
          </div>:<>
            <div className="task-main"><b>{task.title}</b><small>{leadName(task)} · {task.owner} · {task.type} · {task.due || 'Sem prazo'}</small></div>
            <div className="task-actions"><Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge><span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>{task.status!=='Concluída'&&<button className="btn small success" onClick={()=>completeTask(task.id)}>Concluir</button>}<button className="btn small" onClick={()=>{setEditingId(task.id);setEditForm(makeEdit(task))}}>Editar</button><button className="btn small danger" onClick={()=>remove(task.id)}>Excluir</button></div>
          </>}
        </div>)}
        {!visible.length&&<div className="empty">Nada para este filtro.</div>}
      </div>
    </section>
  </div>;
}
