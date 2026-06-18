import { getCrmDataModeLabel } from '@/lib/crm/data-mode';
import type { Screen } from '@/types/crm';

type HeaderProps = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  dataNotice?: string;
  loadingRealData?: boolean;
};

const titles: Record<Screen, string> = {
  dashboard: 'Dashboard comercial',
  leads: 'Contatos e leads',
  kanban: 'Kanban comercial',
  tasks: 'Tarefas e follow-ups',
  messages: 'Mensagens rápidas',
  reports: 'Relatórios',
  settings: 'Configurações'
};

export function Header({ screen, setScreen, dataNotice, loadingRealData }: HeaderProps) {
  const dataModeLabel = loadingRealData ? 'Carregando dados...' : dataNotice || getCrmDataModeLabel();

  return (
    <div className="topbar">
      <div>
        <h1>{titles[screen]}</h1>
        <p>Clack Growth Company • MVP 1 operacional • {dataModeLabel}</p>
      </div>
      <div className="top-actions">
        <button className="btn" onClick={() => setScreen('leads')}>Novo Lead</button>
        <button className="btn primary" onClick={() => setScreen('kanban')}>Abrir Funil</button>
      </div>
    </div>
  );
}
