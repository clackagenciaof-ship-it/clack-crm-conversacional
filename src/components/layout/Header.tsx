import { getCrmDataModeLabel } from '@/lib/crm/data-mode';
import { roleLabels, roleScreens } from '@/lib/crm/permissions';
import type { Screen, UserRole } from '@/types/crm';

type HeaderProps = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  dataNotice?: string;
  loadingRealData?: boolean;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  onLogout?: () => void;
};

const titles: Record<Screen, string> = {
  dashboard: 'Dashboard comercial',
  leads: 'Contatos e leads',
  kanban: 'Kanban comercial',
  tasks: 'Tarefas e follow-ups',
  messages: 'Mensagens rápidas',
  inbox: 'Atendimento',
  reports: 'Relatórios',
  settings: 'Configurações'
};

export function Header({ screen, setScreen, dataNotice, loadingRealData, userRole = 'Admin Empresa', setUserRole, onLogout }: HeaderProps) {
  const dataModeLabel = loadingRealData ? 'Carregando dados...' : dataNotice || getCrmDataModeLabel();
  const allowedScreens = roleScreens[userRole] || roleScreens['Admin Empresa'];
  const canOpenLeads = allowedScreens.includes('leads');
  const canOpenKanban = allowedScreens.includes('kanban');

  return (
    <div className="topbar">
      <div>
        <h1>{titles[screen]}</h1>
        <p>Clack Growth Company • Seu CRM inteligente de vendas e atendimento • {dataModeLabel}</p>
        <span className="role-pill">{roleLabels[userRole] || roleLabels['Admin Empresa']}</span>
      </div>
      <div className="top-actions">
        {userRole !== 'Admin Empresa' && setUserRole && <button className="btn" onClick={() => setUserRole('Admin Empresa')}>Voltar Admin</button>}
        {canOpenLeads && <button className="btn" onClick={() => setScreen('leads')}>Novo Lead</button>}
        {canOpenKanban && <button className="btn primary" onClick={() => setScreen('kanban')}>Abrir Funil</button>}
        {onLogout && <button className="btn" onClick={onLogout}>Sair</button>}
      </div>
    </div>
  );
}
