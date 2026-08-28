import { roleLabels, roleScreens } from '@/lib/crm/permissions';
import type { Screen, UserRole } from '@/types/crm';

type HeaderProps = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  dataNotice?: string;
  loadingRealData?: boolean;
  userRole?: UserRole;
  onLogout?: () => void;
};

const titles: Record<Screen, string> = {
  dashboard: 'Visão geral',
  leads: 'Contatos',
  kanban: 'Pipeline comercial',
  tasks: 'Tarefas e follow-ups',
  messages: 'Modelos de mensagem',
  inbox: 'Central de atendimento',
  intelligence: 'ONE Core',
  'public-engagement': 'Público 360',
  products: 'Catálogo',
  reports: 'Relatórios',
  finance: 'Financeiro',
  onboarding: 'Implantação',
  settings: 'Configurações'
};

export function Header({ screen, setScreen, dataNotice, loadingRealData, userRole = 'Admin Empresa', onLogout }: HeaderProps) {
  const label = loadingRealData ? 'Sincronizando dados reais...' : dataNotice || 'Operação conectada';
  const allowed = roleScreens[userRole] || roleScreens['Admin Empresa'];

  return (
    <header className="topbar">
      <div>
        <span className="one-kicker">ATENDE · ENTENDE · EXECUTA · RESOLVE · VENDE · APRENDE</span>
        <h1>{titles[screen]}</h1>
        <p>{label}</p>
        <span className="role-pill">{roleLabels[userRole] || roleLabels['Admin Empresa']}</span>
      </div>
      <div className="top-actions">
        {allowed.includes('leads') && <button className="btn" onClick={() => setScreen('leads')}>+ Contato</button>}
        {allowed.includes('inbox') && <button className="btn primary" onClick={() => setScreen('inbox')}>Atender</button>}
        {onLogout && <button className="btn" onClick={onLogout}>Sair</button>}
      </div>
    </header>
  );
}
