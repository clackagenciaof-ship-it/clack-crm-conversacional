"use client";

import { AuditPanel } from './AuditPanel';
import { AutomationPanel } from './AutomationPanel';
import { CompanyAdminPanel } from './CompanyAdminPanel';
import { FlowBuilderPanel } from './FlowBuilderPanel';
import { FunnelAdvancedPanel } from './FunnelAdvancedPanel';
import { SettingsPage as BaseSettingsPage } from './SettingsPage';
import type { UserRole } from '@/types/crm';

type SettingsPageProps = {
  currentRole: UserRole;
  currentUserName: string;
  setUserRole: (role: UserRole) => void;
};

export function SettingsPage(props: SettingsPageProps) {
  return (
    <>
      <div className="grid two-col" style={{ marginBottom: 16 }}>
        <CompanyAdminPanel />
        <AuditPanel />
      </div>
      <div style={{ marginBottom: 16 }}>
        <AutomationPanel />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FlowBuilderPanel />
      </div>
      <div style={{ marginBottom: 16 }}>
        <FunnelAdvancedPanel />
      </div>
      <BaseSettingsPage {...props} />
    </>
  );
}
