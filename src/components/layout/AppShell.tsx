"use client";

import { useEffect, useState } from 'react';
import { applyBranding, defaultBranding, loadBranding, type CompanyBranding } from '@/lib/crm/branding-client';
import { roleScreens } from '@/lib/crm/permissions';
import type { ReactNode } from 'react';
import type { Screen, UserRole } from '@/types/crm';

type AppShellProps = { screen: Screen; setScreen: (screen: Screen) => void; userRole?: UserRole; children: ReactNode; };

type NavGroup = { label: string; items: Array<[Screen, string]>; };

const navGroups: NavGroup[] = [
  { label: 'Visão', items: [['dashboard', 'Visão geral']] },
  { label: 'Operação', items: [['leads', 'Contatos'], ['kanban', 'Pipeline'], ['tasks', 'Tarefas']] },
  { label: 'Conversas', items: [['inbox', 'Atendimento'], ['messages', 'Modelos de mensagem']] },
  { label: 'Inteligência', items: [['intelligence', 'ONE Core']] },
  { label: 'Vertical', items: [['public-engagement', 'Público 360']] },
  { label: 'Gestão', items: [['products', 'Catálogo'], ['reports', 'Relatórios'], ['finance', 'Financeiro']] },
  { label: 'Administração', items: [['onboarding', 'Implantação'], ['settings', 'Configurações']] }
];

export function AppShell({ screen, setScreen, userRole = 'Admin Empresa', children }: AppShellProps) {
  const [branding, setBranding] = useState<CompanyBranding>(defaultBranding);
  const allowed = roleScreens[userRole] || roleScreens['Admin Empresa'];

  useEffect(() => {
    let cancelled = false;
    loadBranding().then((data) => {
      if (cancelled) return;
      const next = { ...defaultBranding, ...data.branding };
      setBranding(next);
      applyBranding(next);
    }).catch(() => applyBranding(defaultBranding));
    return () => { cancelled = true; };
  }, []);

  const initial = branding.app_name?.slice(0, 1).toUpperCase() || 'C';
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(([key]) => allowed.includes(key)) }))
    .filter((group) => group.items.length);

  const mobileItems: Array<[Screen, string]> = visibleGroups
    .flatMap((group) => group.items)
    .filter(([key]) => ['dashboard', 'leads', 'kanban', 'inbox', 'intelligence'].includes(key))
    .slice(0, 5);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          {branding.logo_url ? <img src={branding.logo_url} alt={branding.brand_name} className="brand-logo" /> : <div className="logo-mark">{initial}</div>}
          <div><strong>{branding.app_name || 'CLACK ONE'}</strong><span>{branding.brand_name || 'CRM & Operations'}</span></div>
        </div>

        <nav className="nav grouped-nav" aria-label="Navegação principal">
          {visibleGroups.map((group) => {
            const active = group.items.some(([key]) => key === screen);
            if (group.items.length === 1) {
              const [key, label] = group.items[0];
              return <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}><span>{label}</span></button>;
            }
            return (
              <details key={group.label + String(active)} className="nav-group" open={active}>
                <summary>{group.label}<span>{active ? '•' : '+'}</span></summary>
                <div className="nav-submenu">
                  {group.items.map(([key, label]) => <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>{label}</button>)}
                </div>
              </details>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <small>Perfil ativo</small>
          <strong>{userRole}</strong>
          <p>Menu e ações ajustados automaticamente ao seu acesso.</p>
        </div>
      </aside>

      <main className="main">{children}</main>

      <div className="mobile-nav">
        {mobileItems.map(([key, label]) => <button key={key} className={screen === key ? 'active' : ''} onClick={() => setScreen(key)}>{label}</button>)}
      </div>
    </div>
  );
}
