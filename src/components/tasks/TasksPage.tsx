import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CRM_USERS } from '@/lib/crm/constants';
import { taskStatusBadgeStyle } from '@/lib/crm/badge-styles';
import type { Lead, Task, TaskPriority, TaskStatus } from '@/types/crm';

type TaskForm = {
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: TaskPriority;
  due: string;
};

type TaskEditForm = TaskForm & {
  status: TaskStatus;
};

type TasksPageProps = {
  tasks: Task[];
  leads: Lead[];
  taskForm: TaskForm;
  setTaskForm: (form: TaskForm) => void;
  addTask: () => void;
  completeTask: (taskId: number) => void;
  updateTaskItem: (task: Task, form: TaskEditForm) => void | Promise<void>;
  removeTask: (taskId: number) => void | Promise<void>;
};

const users = CRM_USERS.map((user) => user.name);
const taskTypes = ['Ligar', 'Enviar mensagem', 'Reunião', 'Enviar proposta', 'Cobrar retorno', 'Pós-venda', 'Outro'];
const taskStatuses: TaskStatus[] = ['Pendente', 'Em andamento', 'Concluída', 'Vencida', 'Cancelada'];

function createTaskEditForm(task: Task): TaskEditForm {
  return {
    title: task.title,
    leadId: task.leadId,
    owner: task.owner,
    type: task.type,
    priority: task.priority,
    due: task.due,
    status: task.status
  };
}

export function TasksPage({ tasks, leads, taskForm, setTaskForm, addTask, completeTask, updateTaskItem, removeTask }: TasksPageProps) {
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<TaskEditForm | null>(null);

  function getLeadName(task: Task) {
    return task.leadName || leads.find((lead) => lead.id === task.leadId)?.name || 'Lead não identificado';
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditForm(createTaskEditForm(task));
  }

  async function saveTask(task: Task) {
    if (!editForm?.title.trim()) {
      alert('A tarefa precisa de título.');
      return;
    }

    await updateTaskItem(task, editForm);
    setEditingTaskId(null);
    setEditForm(null);
  }

  async function handleRemoveTask(taskId: number) {
    const confirmed = window.confirm('Deseja excluir esta tarefa?');
    if (!confirmed) return;
    await removeTask(taskId);
  }

  return (
    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title">
          <h2>Lista de tarefas</h2>
          <span>Follow-ups e pendências</span>
        </div>

        {tasks.map((task) => (
          <div className="timeline-item" key={task.id}>
            {editingTaskId === task.id && editForm ? (
              <div className="form-grid">
                <input className="input full" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                <select className="select" value={editForm.leadId} onChange={(event) => setEditForm({ ...editForm, leadId: Number(event.target.value) })}>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
                </select>
                <select className="select" value={editForm.owner} onChange={(event) => setEditForm({ ...editForm, owner: event.target.value })}>
                  {users.map((user) => <option key={user}>{user}</option>)}
                </select>
                <select className="select" value={editForm.type} onChange={(event) => setEditForm({ ...editForm, type: event.target.value })}>
                  {taskTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
                <select className="select" value={editForm.priority} onChange={(event) => setEditForm({ ...editForm, priority: event.target.value as TaskPriority })}>
                  <option>Baixa</option>
                  <option>Média</option>
                  <option>Alta</option>
                </select>
                <select className="select" value={editForm.status} onChange={(event) => setEditForm({ ...editForm, status: event.target.value as TaskStatus })}>
                  {taskStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <input className="input full" value={editForm.due} onChange={(event) => setEditForm({ ...editForm, due: event.target.value })} />
                <button className="btn small primary" onClick={() => saveTask(task)}>Salvar</button>
                <button className="btn small" onClick={() => { setEditingTaskId(null); setEditForm(null); }}>Cancelar</button>
              </div>
            ) : (
              <>
                <b>{task.title}</b>
                <br />
                <span className="notice">{getLeadName(task)} • {task.owner} • {task.type} • {task.priority} • {task.due}</span>
                <div style={{ marginTop: 10 }}>
                  <Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge>{' '}
                  <button className="btn small" onClick={() => completeTask(task.id)}>Concluir</button>{' '}
                  <button className="btn small" onClick={() => startEdit(task)}>Editar</button>{' '}
                  <button className="btn small danger" onClick={() => handleRemoveTask(task.id)}>Excluir</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Nova tarefa</h2>
        </div>
        <div className="form-grid">
          <input className="input full" placeholder="Título" value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} />
          <select className="select" value={taskForm.leadId} onChange={(event) => setTaskForm({ ...taskForm, leadId: Number(event.target.value) })}>
            {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}
          </select>
          <select className="select" value={taskForm.owner} onChange={(event) => setTaskForm({ ...taskForm, owner: event.target.value })}>
            {users.map((user) => <option key={user}>{user}</option>)}
          </select>
          <select className="select" value={taskForm.type} onChange={(event) => setTaskForm({ ...taskForm, type: event.target.value })}>
            {taskTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
          <select className="select" value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value as TaskPriority })}>
            <option>Baixa</option>
            <option>Média</option>
            <option>Alta</option>
          </select>
          <input className="input full" value={taskForm.due} onChange={(event) => setTaskForm({ ...taskForm, due: event.target.value })} />
          <button className="btn primary full" onClick={addTask}>Criar tarefa</button>
        </div>
      </div>
    </div>
  );
}
