"use client";

import { useEffect, useState } from 'react';
import { formFromWhatsAppAccount, initialWhatsAppAccountForm, loadWhatsAppAccounts, saveWhatsAppAccount, type WhatsAppAccount, type WhatsAppAccountForm } from '@/lib/whatsapp/account-persistence';

const permissionProfiles = [
  'Admin Empresa — acesso total',
  'Gestor — equipe, relatórios e funil',
  'Vendedor — próprios leads e oportunidades',
  'Atendente — cadastro e atendimento',
  'Financeiro — vendas fechadas e valores'
];

const webhookUrl = 'https://clack-crm-conversacional.vercel.app/api/whatsapp/webhook';
const verifyToken = 'clackcrm_verifica_webhook_2026';

export function SettingsPage() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<WhatsAppAccount | null>(null);
  const [accountForm, setAccountForm] = useState<WhatsAppAccountForm>(initialWhatsAppAccountForm);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

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

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, []);

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
        <h2>Perfis e permissões</h2>
        {permissionProfiles.map((profile) => (
          <div className="timeline-item" key={profile}>{profile}</div>
        ))}
      </div>

      <div className="card pad">
        <div className="section-title">
          <h2>WhatsApp Cloud API</h2>
          <span>{loadingAccounts ? 'Carregando...' : `${accounts.length} conta(s)`}</span>
        </div>

        <div className="timeline-item">
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
              <div style={{ marginTop: 10 }}>
                <button className="btn small" onClick={() => editAccount(account)}>Editar</button>
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
