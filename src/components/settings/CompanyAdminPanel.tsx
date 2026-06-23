"use client";

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { getCurrentProfile } from '@/lib/supabase/crm-repository';

const planOptions = [
  { name: 'Inicial', limit: 5, note: 'até 5 usuários ativos' },
  { name: 'Growth', limit: 10, note: '6 a 10 usuários ativos' },
  { name: 'Pro', limit: 25, note: 'acima de 10 usuários ativos' }
];

type CompanyForm = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  segment: string;
  status: string;
  plan_name: string;
  user_limit: number;
  billing_status: string;
};

const emptyCompany: CompanyForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  segment: '',
  status: 'active',
  plan_name: 'Inicial',
  user_limit: 5,
  billing_status: 'active'
};

function normalizeCompany(data: any): CompanyForm {
  return {
    id: data?.id,
    name: data?.name || '',
    email: data?.email || '',
    phone: data?.phone || '',
    city: data?.city || '',
    state: data?.state || '',
    segment: data?.segment || '',
    status: data?.status || 'active',
    plan_name: data?.plan_name || 'Inicial',
    user_limit: Number(data?.user_limit || 5),
    billing_status: data?.billing_status || 'active'
  };
}

function isClackAdmin(email?: string | null) {
  const normalized = (email || '').trim().toLowerCase();
  return normalized === 'will@clackcrm.com.br' || normalized === 'kkayron.w@gmail.com' || normalized.endsWith('@clackcrm.com.br');
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente no CRM.');

  return token;
}

type CompanyAdminPanelProps = {
  onCompanyChanged?: () => void;
};

export function CompanyAdminPanel({ onCompanyChanged }: CompanyAdminPanelProps) {
  const [visible, setVisible] = useState(false);
  const [companies, setCompanies] = useState<CompanyForm[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [form, setForm] = useState<CompanyForm>(emptyCompany);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadCompanies() {
    setLoading(true);
    try {
      const profile = await getCurrentProfile();
      setVisible(isClackAdmin(profile?.email));
      if (!isClackAdmin(profile?.email)) return;

      const token = await getAccessToken();
      const response = await fetch('/api/companies/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        console.warn(result.error || 'Não foi possível carregar empresas.');
        return;
      }

      const normalizedCompanies = (result.companies || []).map(normalizeCompany);
      setCompanies(normalizedCompanies);
      setActiveCompanyId(result.activeCompanyId || null);
      const activeCompany = normalizedCompanies.find((company: CompanyForm) => company.id === result.activeCompanyId) || normalizedCompanies[0];
      if (activeCompany) setForm(activeCompany);
    } catch (error) {
      console.error('Falha ao carregar painel ADM Clack.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  function updateField(field: keyof CompanyForm, value: string | number) {
    if (field === 'plan_name') {
      const selectedPlan = planOptions.find((plan) => plan.name === value);
      setForm((current) => ({ ...current, plan_name: String(value), user_limit: selectedPlan?.limit || current.user_limit }));
      return;
    }

    if (field === 'user_limit') {
      setForm((current) => ({ ...current, user_limit: Number(value) || 1 }));
      return;
    }

    setForm((current) => ({ ...current, [field]: String(value) }));
  }

  function selectCompany(companyId: string) {
    const company = companies.find((item) => item.id === companyId);
    setForm(company || emptyCompany);
  }

  function newCompany() {
    setForm(emptyCompany);
  }

  async function saveCompany() {
    if (!form.name.trim()) {
      alert('Informe o nome da empresa.');
      return;
    }

    setSaving(true);
    try {
      const token = await getAccessToken();
      const endpoint = form.id ? '/api/companies/update' : '/api/companies/create';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });
      const result = await response.json();

      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível salvar a empresa.');
        return;
      }

      const savedCompany = normalizeCompany(result.company);
      setForm(savedCompany);
      setCompanies((currentCompanies) => {
        const exists = currentCompanies.some((company) => company.id === savedCompany.id);
        if (exists) return currentCompanies.map((company) => company.id === savedCompany.id ? savedCompany : company);
        return [savedCompany, ...currentCompanies];
      });
      alert('Empresa e plano salvos.');
    } catch (error) {
      console.error('Falha ao salvar empresa.', error);
      alert('Não foi possível salvar a empresa agora.');
    } finally {
      setSaving(false);
    }
  }

  async function selectActiveCompany() {
    if (!form.id) return;
    const confirmed = window.confirm(`Deseja alternar o CRM para a empresa ${form.name}?`);
    if (!confirmed) return;

    try {
      const token = await getAccessToken();
      const response = await fetch('/api/companies/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ companyId: form.id })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível alternar empresa.');
        return;
      }
      alert(`Empresa ativa: ${result.company.name}.`);
      onCompanyChanged?.();
      window.location.reload();
    } catch (error) {
      console.error('Falha ao alternar empresa.', error);
      alert('Não foi possível alternar empresa agora.');
    }
  }

  if (!visible) return null;

  return (
    <div className="card pad">
      <div className="section-title">
        <h2>Área ADM Clack</h2>
        <span>{loading ? 'Carregando...' : `${companies.length} empresa(s)`}</span>
      </div>
      <p className="notice">Painel interno para criar empresas, escolher plano, definir limite de usuários e alternar a empresa ativa para suporte.</p>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <select className="select full" value={form.id || ''} onChange={(event) => selectCompany(event.target.value)}>
          <option value="">Nova empresa</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name} • {company.plan_name} • {company.billing_status}</option>)}
        </select>
        <input className="input" placeholder="Nome da empresa" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
        <input className="input" placeholder="E-mail da empresa" value={form.email} onChange={(event) => updateField('email', event.target.value)} />
        <input className="input" placeholder="Telefone" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} />
        <input className="input" placeholder="Cidade" value={form.city} onChange={(event) => updateField('city', event.target.value)} />
        <input className="input" placeholder="UF" value={form.state} onChange={(event) => updateField('state', event.target.value)} />
        <input className="input" placeholder="Segmento" value={form.segment} onChange={(event) => updateField('segment', event.target.value)} />
        <select className="select" value={form.plan_name} onChange={(event) => updateField('plan_name', event.target.value)}>
          {planOptions.map((plan) => <option key={plan.name}>{plan.name}</option>)}
        </select>
        <input className="input" type="number" min={1} placeholder="Limite de usuários" value={form.user_limit} onChange={(event) => updateField('user_limit', Number(event.target.value))} />
        <select className="select" value={form.billing_status} onChange={(event) => updateField('billing_status', event.target.value)}>
          <option value="active">Pagamento ativo</option>
          <option value="blocked">Bloqueado</option>
          <option value="trial">Teste</option>
        </select>
        <select className="select" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
          <option value="active">Empresa ativa</option>
          <option value="inactive">Empresa inativa</option>
        </select>
        <button className="btn primary" disabled={saving} onClick={saveCompany}>{saving ? 'Salvando...' : form.id ? 'Salvar empresa/plano' : 'Criar empresa'}</button>
        <button className="btn" onClick={newCompany}>Nova empresa</button>
        <button className="btn full" disabled={!form.id || form.id === activeCompanyId} onClick={selectActiveCompany}>{form.id === activeCompanyId ? 'Empresa ativa atual' : 'Selecionar como empresa ativa'}</button>
      </div>

      <div className="timeline-item" style={{ marginTop: 16 }}>
        <b>Planos comerciais</b>
        <p className="notice">{planOptions.map((plan) => `${plan.name}: ${plan.note}`).join(' • ')}</p>
        <p className="notice">A empresa ativa define quais leads, equipe, funil e configurações aparecem para atendimento e suporte.</p>
      </div>
    </div>
  );
}
