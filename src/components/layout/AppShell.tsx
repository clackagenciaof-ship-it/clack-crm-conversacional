"use client";

import { useEffect, useState } from 'react';
import { applyBranding, defaultBranding, loadBranding, type CompanyBranding } from '@/lib/crm/branding-client';
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
  const [branding, setBranding] = useState<CompanyBranding>(defaultBranding);
  const allowedScreens = roleScreens[userRole] || roleScreens['Admin Empresa'];
  const visibleNav = nav.filter(([key]) => allowedScreens.includes(key));

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const data = await loadBranding();
        if (cancelled) return;
        const nextBranding = { ...defaultBranding, ...data.branding };
        setBranding(nextBranding);
        applyBranding(nextBranding);
      } catch {
        applyBranding(defaultBranding);
      }
    }
    start();
    return () => { cancelled = true; };
  }, []);

  const initial = branding.app_name?.slice(0, 1).toUpperCase() || 'C';

  return (
    <div className="app">
      <aside className="sidebar" style={{ background: `linear-gradient(180deg, ${branding.sidebar_color || branding.primary_color}, ${branding.primary_color || '#005954'})` }}>
        <div className="brand">
          {branding.logo_url ? <img src={branding.logo_url} alt={branding.brand_name} className="brand-logo" /> : <div className="logo-mark">{initial}</div>}
          <div>
            <strong>{branding.app_name || 'CLACK CRM'}</strong>
            <span>{branding.brand_name || 'Conversacional'}</span>
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
