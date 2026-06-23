"use client";

import { useEffect, useMemo, useState } from 'react';
import { roleDescriptions, roleLabels } from '@/lib/crm/permissions';
import { deleteWhatsAppAccount, formFromWhatsAppAccount, initialWhatsAppAccountForm, loadWhatsAppAccounts, saveWhatsAppAccount, type WhatsAppAccount, type WhatsAppAccountForm } from '@/lib/whatsapp/account-persistence';
import { getCurrentProfile, listCompanyProfiles, type ProfileRow } from '@/lib/supabase/crm-repository';
import type { UserRole } from '@/types/crm';

const roles: UserRole[] = ['Admin Empresa', 'Gestor', 'Vendedor', 'Atendente', 'Financeiro'];
const webhookUrl = 'https://clack-crm-conversacional.vercel.app/api/whatsapp/webhook';
const verifyToken = 'clackcrm_verifica_webhook_2026';

type SettingsPageProps = {
  currentRole: UserRole;
  currentUserName: string;
  setUserRole: (role: UserRole) => void;
};

export function SettingsPage({ currentRole, currentUserName, setUserRole }: SettingsPageProps) {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [accountForm, setAccountForm] = useState<WhatsAppAccountForm>(initialWhatsAppAccountForm);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [team, setTeam] = useState<ProfileRow[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const canViewTeam = currentRole === 'Admin Empresa' || currentRole === 'Gestor';
  const canManageTeam = currentRole === 'Admin Empresa';

  const roleCounts = useMemo(() => roles.map((role) => ({
    role,
    count: team.filter((member) => roleLabels[role].toLowerCase().includes((member.role || '').toLowerCase()) || member.role === role).length
  })), [team]);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      setLoadingAccounts(true);
      try {
        const data = await loadWhatsAppAccounts();
        if (!cancelled) setAccounts(data);
      } catch (error) {
        console.error('Falha ao carregar contas WhatsApp.', error);
      } finally {
        if (!cancelled) setLoadingAccounts(false);
      }
    }

    async function loadTeam() {
      if (!canViewTeam) return;
      setLoadingTeam(true);
      try {
        const profile = await getCurrentProfile();
        if (!profile?.company_id) return;
        const data = await listCompanyProfiles(profile.company_id);
        if (!cancelled) setTeam(data);
      } catch (error) {
        console.error('Falha ao carregar equipe.', error);
      } finally {
        if (!cancelled) setLoadingTeam(false);
      }
    }

    loadAccounts();
    loadTeam();

    return () => {
      cancelled = true;
    };
  }, [canViewTeam]);

  function editAccount(account: WhatsAppAccount) {
    setSelectedAccount(account);
    setAccountForm(formFromWhatsAppAccount(account));
  }

  function resetAccountForm() {
    setSelectedAccount(null);
    setAccountForm(initialWhatsAppAccountForm);
  }

  async function handleSaveAccount() {
    if (!accountForm.phone_number_id.trim()) {
      alert('Informe o Phone Number ID da Meta.');
      return;
    }

    try {
      const savedAccount = await saveWhatsAppAccount(accountForm, selectedAccount);
      setAccounts((currentAccounts) => {
        const exists = currentAccounts.some((account) => account.id === savedAccount.id);
        if (exists) return currentAccounts.map((account) => account.id === savedAccount.id ? savedAccount : account);
        return [savedAccount, ...currentAccounts];
      });
      setSelectedAccount(savedAccount);
      alert('Conta WhatsApp salva.');
    } catch (error) {
      console.error('Falha ao salvar conta WhatsApp.', error);
      alert('Não foi possível salvar a conta WhatsApp. Confira os dados e tente novamente.');
    }
  }

  async function handleDeleteAccount(account: WhatsAppAccount) {
    const label = account.display_phone_number || account.phone_number_id;
    const confirmed = window.confirm(`Deseja excluir a conta WhatsApp ${label}? Essa ação remove apenas a configuração do CRM.`);

    if (!confirmed) return;

    try {
      await deleteWhatsAppAccount(account);
      setAccounts((currentAccounts) => currentAccounts.filter((item) => item.id !== account.id));
      if (selectedAccount?.id === account.id) resetAccountForm();
      alert('Conta WhatsApp excluída.');
    } catch (error) {
      console.error('Falha ao excluir conta WhatsApp.', error);
      alert('Não foi possível excluir a conta WhatsApp.');
    }
  }

  return (
    <div className="grid two-col">
      <div className="card pad">
        <h2>Empresa</h2>
        <div className="form-grid">
          <input className="input" defaultValue="Clack Growth Company" />
          <input className="input" defaultValue="will@clackcrm.com.br" />
          <input className="input" defaultValue="Nordeste, Sul e Centro-Oeste" />
          <input className="input" defaultValue="Growth, Marketing, Comercial e RH" />
        </div>
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>Perfis e permissões</h2>
          <span>{currentUserName}</span>
        </div>
        {roles.map((role) => (
          <div className="timeline-item" key={role}>
            <b>{roleLabels[role]}</b>
            <p className="notice">{roleDescriptions[role]}</p>
          </div>
        ))}
      </div>

      {canViewTeam && (
        <div className="card pad">
          <div className="section-title">
            <h2>Equipe e acessos</h2>
            <span>{loadingTeam ? 'Carregando...' : `${team.length || 1} pessoa(s)`}</span>
          </div>

          <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {roleCounts.map((item) => (
              <div className="metric" key={item.role}>
                <span>{item.role}</span>
                <strong>{item.count || (item.role === currentRole ? 1 : 0)}</strong>
                <small>usuário(s)</small>
              </div>
            ))}
          </div>

          <div className="timeline" style={{ marginTop: 16 }}>
            {team.map((member) => (
              <div className="timeline-item" key={member.id}>
                <b>{member.name}</b>
                <p className="notice">{member.email} • {member.role} • {member.status}</p>
              </div>
            ))}
            {!team.length && (
              <div className="timeline-item">
                <b>{currentUserName}</b>
                <p className="notice">Usuário atual • {currentRole}</p>
              </div>
            )}
          </div>

          {canManageTeam ? (
            <div className="timeline-item" style={{ marginTop: 16 }}>
              <b>Criação de novos acessos</b>
              <p className="notice">Somente o Admin Empresa pode criar Gestor, Vendedor, Atendente e Financeiro. Para a apresentação, use o modo abaixo para visualizar cada perfil. A criação real de novos logins fica protegida no Supabase Auth.</p>
            </div>
          ) : (
            <div className="timeline-item" style={{ marginTop: 16 }}>
              <b>Acesso de gestor</b>
              <p className="notice">O Gestor visualiza a equipe e os indicadores, mas não cria novos logins.</p>
            </div>
          )}
        </div>
      )}

      {canManageTeam && (
        <div className="card pad">
          <div className="section-title">
            <h2>Visualizar como</h2>
            <span>Modo apresentação</span>
          </div>
          <p className="notice">Use estes botões para demonstrar, sem sair do CRM, como cada perfil enxerga menus e funcionalidades.</p>
          <div className="form-grid">
            {roles.map((role) => (
              <button key={role} className={currentRole === role ? 'btn primary' : 'btn'} onClick={() => setUserRole(role)}>
                {role}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card pad">
        <div className="section-title">
          <h2>WhatsApp Cloud API</h2>
          <span>{loadingAccounts ? 'Carregando...' : `${accounts.length} conta(s)`}</span>
        </div>

        <div className="timeline-item">
          <b>Para que serve?</b>
          <p className="notice">Conecta o CRM à API oficial da Meta para receber mensagens reais do WhatsApp, responder pelo CRM, registrar histórico do cliente, controlar status de envio e futuramente usar templates aprovados.</p>
          <b>URL do webhook</b>
          <p className="notice">{webhookUrl}</p>
          <b>Token de verificação</b>
          <p className="notice">{verifyToken}</p>
        </div>

        <div className="form-grid">
          <input className="input full" placeholder="Phone Number ID" value={accountForm.phone_number_id} onChange={(event) => setAccountForm({ ...accountForm, phone_number_id: event.target.value })} />
          <input className="input" placeholder="Número exibido" value={accountForm.display_phone_number} onChange={(event) => setAccountForm({ ...accountForm, display_phone_number: event.target.value })} />
          <input className="input" placeholder="Business Account ID" value={accountForm.business_account_id} onChange={(event) => setAccountForm({ ...accountForm, business_account_id: event.target.value })} />
          <select className="select" value={accountForm.status} onChange={(event) => setAccountForm({ ...accountForm, status: event.target.value })}>
            <option>Ativa</option>
            <option>Em validação</option>
            <option>Inativa</option>
          </select>
          <button className="btn primary" onClick={handleSaveAccount}>{selectedAccount ? 'Atualizar conta' : 'Salvar conta'}</button>
          <button className="btn" onClick={resetAccountForm}>Nova conta</button>
        </div>

        <div className="timeline">
          {accounts.map((account) => (
            <div className="timeline-item" key={account.id}>
              <b>{account.display_phone_number || 'Número sem rótulo'}</b>
              <br />
              <span className="notice">Phone Number ID: {account.phone_number_id}</span>
              <br />
              <span className="notice">Business Account ID: {account.business_account_id || 'Não informado'} • {account.status}</span>
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn small" onClick={() => editAccount(account)}>Editar</button>
                <button className="btn small danger" onClick={() => handleDeleteAccount(account)}>Excluir</button>
              </div>
            </div>
          ))}
          {!accounts.length && <div className="empty">Nenhuma conta WhatsApp cadastrada ainda.</div>}
        </div>
      </div>

      <div className="card pad">
        <h2>Módulos em breve</h2>
        <p className="notice">Automação, InfinitePay, API oficial de mensageria, webhooks, white label e IA.</p>
      </div>
    </div>
  );
}
