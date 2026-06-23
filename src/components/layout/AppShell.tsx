import { roleScreens } from '@/lib/crm/permissions';
import type { ReactNode } from 'react';
import type { Screen, UserRole } from '@/types/crm';

type AppShellProps = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  userRole?: UserRole;
  children: ReactNode;
};

const nav = [
  ['dashboard', 'Dashboard'],
  ['leads', 'Leads'],
  ['kanban', 'Kanban'],
  ['tasks', 'Tarefas'],
  ['messages', 'Mensagens'],
  ['inbox', 'Atendimento'],
  ['products', 'Produtos'],
  ['reports', 'Relatórios'],
  ['finance', 'Financeiro'],
  ['onboarding', 'Onboarding'],
  ['settings', 'Configurações']
] as const;

export function AppShell({ screen, setScreen, userRole = 'Admin Empresa', children }: AppShellProps) {
  const allowedScreens = roleScreens[userRole] || roleScreens['Admin Empresa'];
  const visibleNav = nav.filter(([key]) => allowedScreens.includes(key));

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-mark">C</div>
          <div>
            <strong>CLACK CRM</strong>
            <span>Conversacional</span>
          </div>
        </div>

        <div className="nav">
          {visibleNav.map(([key, label]) => (
            <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="sidebar-card">
          <strong>{userRole}</strong>
          <p>Menu ajustado automaticamente conforme o perfil de acesso ativo.</p>
        </div>
      </aside>

      <main className="main">{children}</main>

      <div className="mobile-nav">
        {visibleNav.slice(0, 5).map(([key, label]) => (
          <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
