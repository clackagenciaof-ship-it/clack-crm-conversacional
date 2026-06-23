"use client";

import { useEffect, useMemo, useState } from 'react';
import { createFinanceInvoice, generateInvoicesFromWonDeals, loadFinanceData, updateFinanceInvoice, type FinanceEntry, type FinanceForm, type FinanceInvoice, type WonDeal } from '@/lib/crm/finance-admin';

const emptyForm: FinanceForm = { customer_name: '', description: '', amount: '', status: 'Pendente', due_at: '', paid_at: '', payment_method: '', notes: '' };
const statusOptions = ['Pendente', 'Pago', 'Vencido', 'Cancelado'];
const methodOptions = ['Pix', 'Cartão', 'Boleto', 'Dinheiro', 'Transferência', 'Outro'];

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return 'Sem data';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

function contactNameFromDeal(deal: WonDeal) {
  const contacts = deal.contacts as any;
  if (Array.isArray(contacts)) return contacts[0]?.name || 'Cliente sem nome';
  return contacts?.name || 'Cliente sem nome';
}

export function FinancePage() {
  const [invoices, setInvoices] = useState<FinanceInvoice[]>([]);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [wonDeals, setWonDeals] = useState<WonDeal[]>([]);
  const [form, setForm] = useState<FinanceForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Todos');

  async function refresh(showAlert = false) {
    setLoading(true);
    try {
      const data = await loadFinanceData();
      setInvoices(data.invoices);
      setEntries(data.entries);
      setWonDeals(data.wonDeals);
      if (showAlert) alert('Financeiro atualizado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível carregar financeiro.';
      alert(message);
    } finally { setLoading(false); }
  }

  useEffect(() => { refresh(); }, []);

  const today = new Date().toISOString().slice(0, 10);
  const normalizedInvoices = useMemo(() => invoices.map((invoice) => ({ ...invoice, status: invoice.status === 'Pendente' && invoice.due_at && invoice.due_at < today ? 'Vencido' : invoice.status })), [invoices, today]);
  const filteredInvoices = normalizedInvoices.filter((invoice) => statusFilter === 'Todos' || invoice.status === statusFilter);
  const metrics = {
    sold: invoices.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    received: invoices.filter((item) => item.status === 'Pago').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    open: normalizedInvoices.filter((item) => item.status === 'Pendente').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    overdue: normalizedInvoices.filter((item) => item.status === 'Vencido').reduce((sum, item) => sum + Number(item.amount || 0), 0),
    conversion: invoices.length ? Math.round((invoices.filter((item) => item.status === 'Pago').length / invoices.length) * 100) : 0
  };

  async function submitInvoice() {
    if (!form.customer_name.trim() || !form.description.trim()) { alert('Informe cliente e descrição.'); return; }
    setSaving(true);
    try {
      const invoice = await createFinanceInvoice(form);
      setInvoices((current) => [invoice, ...current]);
      setForm(emptyForm);
      alert('Recebimento criado.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível criar recebimento.';
      alert(message);
    } finally { setSaving(false); }
  }

  async function markInvoice(invoice: FinanceInvoice, status: string) {
    try {
      const updated = await updateFinanceInvoice(invoice.id, { status, due_at: invoice.due_at, paid_at: status === 'Pago' ? today : invoice.paid_at, payment_method: invoice.payment_method || 'Pix', notes: invoice.notes });
      setInvoices((current) => current.map((item) => item.id === invoice.id ? updated : item));
      alert(`Recebimento marcado como ${status}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível atualizar recebimento.';
      alert(message);
    }
  }

  async function generateFromWon() {
    setSaving(true);
    try {
      const created = await generateInvoicesFromWonDeals();
      await refresh();
      alert(`${created.length} recebimento(s) gerado(s) a partir das vendas ganhas.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível gerar recebimentos.';
      alert(message);
    } finally { setSaving(false); }
  }

  function useWonDeal(deal: WonDeal) {
    setForm({
      customer_name: contactNameFromDeal(deal),
      description: deal.title || 'Venda ganha',
      amount: String(Number(deal.value || 0)),
      status: 'Pendente',
      due_at: '',
      paid_at: '',
      payment_method: '',
      notes: 'Recebimento criado a partir do funil comercial.'
    });
  }

  return (
    <div className="grid" style={{ gap: 16 }}>
      <div className="grid metrics">
        <div className="card metric"><span>Total faturado</span><strong>{brl(metrics.sold)}</strong><small>recebimentos criados</small></div>
        <div className="card metric"><span>Recebido</span><strong>{brl(metrics.received)}</strong><small>baixado como pago</small></div>
        <div className="card metric"><span>Em aberto</span><strong>{brl(metrics.open)}</strong><small>pendente</small></div>
        <div className="card metric"><span>Vencido</span><strong>{brl(metrics.overdue)}</strong><small>atenção do financeiro</small></div>
        <div className="card metric"><span>Conversão financeira</span><strong>{metrics.conversion}%</strong><small>pagos / total</small></div>
        <div className="card metric"><span>Vendas ganhas</span><strong>{wonDeals.length}</strong><small>funil comercial</small></div>
      </div>

      <div className="grid two-col">
        <div className="card pad">
          <div className="section-title"><h2>Recebimentos</h2><span>{loading ? 'Carregando...' : `${filteredInvoices.length} título(s)`}</span></div>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <button className="btn" onClick={() => refresh(true)}>Atualizar financeiro</button>
            <button className="btn primary" disabled={saving} onClick={generateFromWon}>{saving ? 'Gerando...' : 'Gerar das vendas ganhas'}</button>
            <select className="select full" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>Todos</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
          </div>

          <div className="timeline">
            {filteredInvoices.map((invoice) => <div className="timeline-item" key={invoice.id}>
              <div className="section-title"><b>{invoice.customer_name}</b><span>{invoice.status}</span></div>
              <p><b>{invoice.description}</b></p>
              <p className="notice">Valor: {brl(Number(invoice.amount || 0))} • Vencimento: {formatDate(invoice.due_at)} • Pago em: {formatDate(invoice.paid_at)} • Método: {invoice.payment_method || '—'}</p>
              {invoice.notes && <p className="notice">{invoice.notes}</p>}
              <div className="deal-actions"><button className="btn small success" onClick={() => markInvoice(invoice, 'Pago')}>Marcar pago</button><button className="btn small" onClick={() => markInvoice(invoice, 'Pendente')}>Pendente</button><button className="btn small danger" onClick={() => markInvoice(invoice, 'Cancelado')}>Cancelar</button></div>
            </div>)}
            {!filteredInvoices.length && <div className="empty">Nenhum recebimento encontrado para este filtro.</div>}
          </div>
        </div>

        <div className="card pad">
          <div className="section-title"><h2>Novo recebimento</h2><span>Fase 11</span></div>
          <div className="form-grid">
            <input className="input full" placeholder="Cliente" value={form.customer_name} onChange={(event) => setForm({ ...form, customer_name: event.target.value })} />
            <input className="input full" placeholder="Descrição da venda/serviço" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            <input className="input" placeholder="Valor" type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
            <select className="select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
            <input className="input" type="date" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} />
            <select className="select" value={form.payment_method} onChange={(event) => setForm({ ...form, payment_method: event.target.value })}><option value="">Método</option>{methodOptions.map((method) => <option key={method}>{method}</option>)}</select>
            <textarea className="input full" placeholder="Observações" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} style={{ minHeight: 90 }} />
            <button className="btn primary full" disabled={saving} onClick={submitInvoice}>{saving ? 'Salvando...' : 'Criar recebimento'}</button>
          </div>

          <div className="timeline" style={{ marginTop: 16 }}>
            <div className="timeline-item"><b>Leitura executiva</b><p className="notice">Onde acelerar: priorize títulos vencidos, propostas ganhas sem recebimento e vendas com maior valor em aberto.</p></div>
            <div className="timeline-item"><b>Próximo passo financeiro</b><p className="notice">Depois conectamos InfinitePay, emissão de cobrança, link de pagamento e conciliação automática.</p></div>
          </div>
        </div>
      </div>

      <div className="grid two-col">
        <div className="card pad">
          <div className="section-title"><h2>Vendas ganhas sem conferência</h2><span>{wonDeals.length} venda(s)</span></div>
          <div className="timeline">{wonDeals.slice(0, 8).map((deal) => <div className="timeline-item" key={deal.id}><div className="section-title"><b>{contactNameFromDeal(deal)}</b><span>{brl(Number(deal.value || 0))}</span></div><p className="notice">{deal.title}</p><button className="btn small" onClick={() => useWonDeal(deal)}>Usar no formulário</button></div>)}{!wonDeals.length && <div className="empty">Nenhuma venda ganha encontrada.</div>}</div>
        </div>
        <div className="card pad">
          <div className="section-title"><h2>Entradas recentes</h2><span>{entries.length}</span></div>
          <div className="timeline">{entries.map((entry) => <div className="timeline-item" key={entry.id}><div className="section-title"><b>{entry.description}</b><span>{brl(Number(entry.amount || 0))}</span></div><p className="notice">{formatDate(entry.occurred_at)} • {entry.payment_method || 'Não informado'}</p></div>)}{!entries.length && <div className="empty">Nenhuma entrada registrada ainda.</div>}</div>
        </div>
      </div>
    </div>
  );
}
