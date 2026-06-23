import type { Screen } from '@/types/crm';

type AppShellProps = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  children: React.ReactNode;
};

const nav = [
  ['dashboard', 'Dashboard'],
  ['leads', 'Leads'],
  ['kanban', 'Kanban'],
  ['tasks', 'Tarefas'],
  ['messages', 'Mensagens'],
  ['inbox', 'Atendimento'],
  ['reports', 'Relatórios'],
  ['settings', 'Configurações']
] as const;

export function AppShell({ screen, setScreen, children }: AppShellProps) {
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
          {nav.map(([key, label]) => (
            <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="sidebar-card">
          <strong>Próximas fases</strong>
          <p>Automação, pagamentos InfinitePay, API oficial de mensageria, webhooks, white label e IA aparecem como módulos em breve.</p>
        </div>
      </aside>

      <main className="main">{children}</main>

      <div className="mobile-nav">
        {nav.slice(0, 5).map(([key, label]) => (
          <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
