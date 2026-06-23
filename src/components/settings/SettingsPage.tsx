"use client";

import { useEffect, useMemo, useState } from 'react';
import { normalizeRole, roleDescriptions, roleLabels } from '@/lib/crm/permissions';
import { deleteWhatsAppAccount, formFromWhatsAppAccount, initialWhatsAppAccountForm, loadWhatsAppAccounts, saveWhatsAppAccount, type WhatsAppAccount, type WhatsAppAccountForm } from '@/lib/whatsapp/account-persistence';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
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

type NewUserForm = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type EditUserForm = {
  name: string;
  role: UserRole;
  status: 'active' | 'inactive';
};

type CompanyPlan = {
  plan_name: string;
  user_limit: number;
  billing_status: string;
};

const initialNewUserForm: NewUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'Vendedor'
};

function planLabel(plan: CompanyPlan | null) {
  if (!plan) return 'Plano Inicial';
  return `Plano ${plan.plan_name}`;
}

export function SettingsPage({ currentRole, currentUserName, setUserRole }: SettingsPageProps) {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [accountForm, setAccountForm] = useState<WhatsAppAccountForm>(initialWhatsAppAccountForm);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [team, setTeam] = useState<ProfileRow[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(initialNewUserForm);
  const [editingMember, setEditingMember] = useState<ProfileRow | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserForm | null>(null);
  const [companyPlan, setCompanyPlan] = useState<CompanyPlan | null>(null);

  const canViewTeam = currentRole === 'Admin Empresa' || currentRole === 'Gestor';
  const canManageTeam = currentRole === 'Admin Empresa';
  const visibleTeam = team.filter((member) => member.status !== 'removed');
  const activeUsers = visibleTeam.filter((member) => member.status === 'active').length;
  const userLimit = companyPlan?.user_limit || 5;
  const remainingUsers = Math.max(userLimit - activeUsers, 0);
  const reachedUserLimit = activeUsers >= userLimit;

  const roleCounts = useMemo(() => roles.map((role) => ({
    role,
    count: visibleTeam.filter((member) => normalizeRole(member.role) === role && member.status === 'active').length
  })), [visibleTeam]);

  async function getAccessToken() {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) throw new Error('Supabase não configurado.');

    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente no CRM.');

    return token;
  }

  async function loadCompanyPlan(companyId: string) {
    const supabase = createSupabaseBrowserClient() as any;
    if (!supabase) return;

    const { data, error } = await supabase
      .from('companies')
      .select('plan_name, user_limit, billing_status')
      .eq('id', companyId)
      .single();

    if (error) {
      console.warn('Plano da empresa indisponível. Usando limite padrão.', error);
      setCompanyPlan({ plan_name: 'Inicial', user_limit: 5, billing_status: 'active' });
      return;
    }

    setCompanyPlan({
      plan_name: data?.plan_name || 'Inicial',
      user_limit: Number(data?.user_limit || 5),
      billing_status: data?.billing_status || 'active'
    });
  }

  async function refreshTeam() {
    if (!canViewTeam) return;

    setLoadingTeam(true);
    try {
      const profile = await getCurrentProfile();
      if (!profile?.company_id) return;
      await loadCompanyPlan(profile.company_id);
      const data = await listCompanyProfiles(profile.company_id);
      setTeam(data);
    } catch (error) {
      console.error('Falha ao carregar equipe.', error);
    } finally {
      setLoadingTeam(false);
    }
  }

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
        await loadCompanyPlan(profile.company_id);
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

  async function createTeamUser() {
    if (!canManageTeam) return;
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password.trim()) {
      alert('Informe nome, e-mail e senha inicial.');
      return;
    }

    if (reachedUserLimit) {
      alert(`Limite de usuários atingido no ${planLabel(companyPlan)}. Para adicionar mais acessos, solicite upgrade do plano.`);
      return;
    }

    setSavingUser(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newUserForm)
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível criar o usuário.');
        return;
      }

      setTeam((currentTeam) => [result.profile as ProfileRow, ...currentTeam]);
      setNewUserForm(initialNewUserForm);
      alert('Usuário criado com acesso real ao CRM.');
    } catch (error) {
      console.error('Falha ao criar usuário.', error);
      alert('Não foi possível criar o usuário. Confira a sessão e as variáveis da Vercel.');
    } finally {
      setSavingUser(false);
    }
  }

  async function updateTeamUser(member: ProfileRow, payload: Partial<Pick<ProfileRow, 'name' | 'role' | 'status'>>) {
    if (!canManageTeam) return null;

    setUpdatingUserId(member.id);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: member.id, ...payload })
      });

      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível atualizar o usuário.');
        return null;
      }

      const updatedProfile = result.profile as ProfileRow;
      setTeam((currentTeam) => currentTeam.map((item) => item.id === member.id ? updatedProfile : item));
      return updatedProfile;
    } catch (error) {
      console.error('Falha ao atualizar usuário.', error);
      alert('Não foi possível atualizar o usuário.');
      return null;
    } finally {
      setUpdatingUserId(null);
    }
  }

  function startEditMember(member: ProfileRow) {
    setEditingMember(member);
    setEditUserForm({
      name: member.name || '',
      role: normalizeRole(member.role),
      status: member.status === 'active' ? 'active' : 'inactive'
    });
  }

  async function saveEditedMember() {
    if (!editingMember || !editUserForm) return;
    if (!editUserForm.name.trim()) {
      alert('Informe o nome do usuário.');
      return;
    }

    const updated = await updateTeamUser(editingMember, editUserForm as any);
    if (updated) {
      setEditingMember(null);
      setEditUserForm(null);
      alert('Usuário atualizado.');
    }
  }

  async function removeMemberAccess(member: ProfileRow) {
    const confirmed = window.confirm(`Deseja excluir o acesso de ${member.name}? Por segurança, o login será inativado e o histórico da equipe será preservado.`);
    if (!confirmed) return;

    const updated = await updateTeamUser(member, { status: 'inactive' });
    if (updated) {
      alert('Acesso excluído com segurança. O usuário não conseguirá entrar enquanto estiver inativo.');
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
            <span>{loadingTeam ? 'Carregando...' : `${visibleTeam.length || 1} pessoa(s)`}</span>
          </div>

          <div className="timeline-item">
            <b>{planLabel(companyPlan)} — limite de usuários</b>
            <p className="notice">
              {activeUsers} usuário(s) ativo(s) de {userLimit}. Restam {remainingUsers} acesso(s). {companyPlan?.billing_status === 'active' ? 'Plano ativo.' : 'Plano bloqueado.'}
            </p>
            <p className="notice">Inicial: até 5 usuários ativos • Growth: 6 a 10 • Pro: acima de 10. A equipe ADM Clack define plano, limite, upgrade e cobrança.</p>
            {reachedUserLimit && <p className="notice"><b>Limite de usuários atingido. Para adicionar mais acessos, solicite upgrade do plano.</b></p>}
          </div>

          <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
            {roleCounts.map((item) => (
              <div className="metric" key={item.role}>
                <span>{item.role}</span>
                <strong>{item.count || (item.role === currentRole ? 1 : 0)}</strong>
                <small>usuário(s) ativo(s)</small>
              </div>
            ))}
          </div>

          {canManageTeam && (
            <div className="timeline-item" style={{ marginTop: 16 }}>
              <b>Criar novo acesso real</b>
              <p className="notice">Somente o Admin Empresa cria novos logins, respeitando o limite contratado no plano.</p>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <input className="input" placeholder="Nome completo" value={newUserForm.name} onChange={(event) => setNewUserForm({ ...newUserForm, name: event.target.value })} />
                <input className="input" placeholder="E-mail de acesso" value={newUserForm.email} onChange={(event) => setNewUserForm({ ...newUserForm, email: event.target.value })} />
                <input className="input" placeholder="Senha inicial" type="password" value={newUserForm.password} onChange={(event) => setNewUserForm({ ...newUserForm, password: event.target.value })} />
                <select className="select" value={newUserForm.role} onChange={(event) => setNewUserForm({ ...newUserForm, role: event.target.value as UserRole })}>
                  {roles.filter((role) => role !== 'Admin Empresa').map((role) => <option key={role}>{role}</option>)}
                </select>
                <button className="btn primary full" disabled={savingUser || reachedUserLimit} onClick={createTeamUser}>{savingUser ? 'Criando...' : reachedUserLimit ? 'Limite atingido' : 'Criar usuário'}</button>
              </div>
            </div>
          )}

          {canManageTeam && editingMember && editUserForm && (
            <div className="timeline-item" style={{ marginTop: 16 }}>
              <b>Editar usuário</b>
              <p className="notice">{editingMember.email}</p>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <input className="input" value={editUserForm.name} onChange={(event) => setEditUserForm({ ...editUserForm, name: event.target.value })} />
                <select className="select" value={editUserForm.role} onChange={(event) => setEditUserForm({ ...editUserForm, role: event.target.value as UserRole })}>
                  {roles.map((role) => <option key={role}>{role}</option>)}
                </select>
                <select className="select" value={editUserForm.status} onChange={(event) => setEditUserForm({ ...editUserForm, status: event.target.value as 'active' | 'inactive' })}>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
                <button className="btn primary" disabled={updatingUserId === editingMember.id} onClick={saveEditedMember}>Salvar edição</button>
                <button className="btn full" onClick={() => { setEditingMember(null); setEditUserForm(null); }}>Cancelar edição</button>
              </div>
            </div>
          )}

          <div className="timeline" style={{ marginTop: 16 }}>
            {visibleTeam.map((member) => (
              <div className="timeline-item" key={member.id}>
                <b>{member.name}</b>
                <p className="notice">{member.email} • {normalizeRole(member.role)} • {member.status === 'active' ? 'Ativo' : 'Inativo'}</p>
                {canManageTeam && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn small" disabled={updatingUserId === member.id} onClick={() => startEditMember(member)}>Editar</button>
                    <button
                      className={member.status === 'active' ? 'btn small danger' : 'btn small success'}
                      disabled={updatingUserId === member.id}
                      onClick={() => updateTeamUser(member, { status: member.status === 'active' ? 'inactive' : 'active' })}
                    >
                      {member.status === 'active' ? 'Inativar' : 'Ativar'}
                    </button>
                    <button className="btn small danger" disabled={updatingUserId === member.id} onClick={() => removeMemberAccess(member)}>Excluir</button>
                  </div>
                )}
              </div>
            ))}
            {!visibleTeam.length && (
              <div className="timeline-item">
                <b>{currentUserName}</b>
                <p className="notice">Usuário atual • {currentRole}</p>
              </div>
            )}
          </div>

          {canManageTeam ? (
            <div className="timeline-item" style={{ marginTop: 16 }}>
              <b>Regra de segurança</b>
              <p className="notice">A criação e alteração de acessos passam por validação no servidor. Se o usuário logado não for Admin Empresa, a API bloqueia a ação.</p>
              <button className="btn small" onClick={refreshTeam}>Atualizar equipe</button>
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
