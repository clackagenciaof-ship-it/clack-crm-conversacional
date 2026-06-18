import { Badge } from '@/components/ui/Badge';
import { CRM_USERS } from '@/lib/crm/constants';
import { taskStatusBadgeStyle } from '@/lib/crm/badge-styles';
import type { Lead, Task, TaskPriority } from '@/types/crm';

type TaskForm = {
  title: string;
  leadId: number;
  owner: string;
  type: string;
  priority: TaskPriority;
  due: string;
};

type TasksPageProps = {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  leads: Lead[];
  taskForm: TaskForm;
  setTaskForm: (form: TaskForm) => void;
  addTask: () => void;
};

const users = CRM_USERS.map((user) => user.name);
const taskTypes = ['Ligar', 'Enviar mensagem', 'Reunião', 'Enviar proposta', 'Cobrar retorno', 'Pós-venda', 'Outro'];

export function TasksPage({ tasks, setTasks, leads, taskForm, setTaskForm, addTask }: TasksPageProps) {
  function completeTask(taskId: number) {
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, status: 'Concluída' } : task)));
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
            <b>{task.title}</b>
            <br />
            <span className="notice">{task.owner} • {task.type} • {task.priority} • {task.due}</span>
            <div style={{ marginTop: 10 }}>
              <Badge style={taskStatusBadgeStyle(task.status)}>{task.status}</Badge>{' '}
              <button className="btn small" onClick={() => completeTask(task.id)}>Concluir</button>
            </div>
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
