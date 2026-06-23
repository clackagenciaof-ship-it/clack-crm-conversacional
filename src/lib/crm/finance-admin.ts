import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type FinanceInvoice = {
  id: string;
  company_id: string;
  contact_id: string | null;
  opportunity_id: string | null;
  customer_name: string;
  description: string;
  amount: number;
  status: string;
  due_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
};

export type FinanceEntry = {
  id: string;
  description: string;
  amount: number;
  entry_type: string;
  occurred_at: string;
  payment_method: string | null;
};

export type WonDeal = {
  id: string;
  contact_id: string | null;
  title: string;
  value: number;
  status: string;
  contacts?: { name?: string } | Array<{ name?: string }> | null;
};

export type FinanceForm = {
  customer_name: string;
  description: string;
  amount: string;
  status: string;
  due_at: string;
  paid_at: string;
  payment_method: string;
  notes: string;
};

async function getSessionHeader() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const sessionToken = data.session?.access_token;
  if (!sessionToken) throw new Error('Sessão expirada. Entre novamente no CRM.');
  return { Authorization: `Bearer ${sessionToken}` };
}

export async function loadFinanceData() {
  const response = await fetch('/api/finance', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar financeiro.');
  return {
    invoices: (result.invoices || []) as FinanceInvoice[],
    entries: (result.entries || []) as FinanceEntry[],
    wonDeals: (result.wonDeals || []) as WonDeal[]
  };
}

export async function createFinanceInvoice(form: FinanceForm) {
  const response = await fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({
      action: 'create_invoice',
      customer_name: form.customer_name,
      description: form.description,
      amount: Number(form.amount || 0),
      status: form.status,
      due_at: form.due_at || null,
      paid_at: form.paid_at || null,
      payment_method: form.payment_method || null,
      notes: form.notes || null
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível criar recebimento.');
  return result.invoice as FinanceInvoice;
}

export async function updateFinanceInvoice(invoiceId: string, payload: Partial<FinanceInvoice>) {
  const response = await fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'update_invoice', invoiceId, ...payload })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível atualizar recebimento.');
  return result.invoice as FinanceInvoice;
}

export async function generateInvoicesFromWonDeals() {
  const response = await fetch('/api/finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'create_from_won' })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível gerar recebimentos das vendas ganhas.');
  return (result.created || []) as FinanceInvoice[];
}
