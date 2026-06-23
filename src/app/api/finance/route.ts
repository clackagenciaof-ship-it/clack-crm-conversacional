import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type FinancePayload = {
  action?: 'create_invoice' | 'update_invoice' | 'create_from_won';
  invoiceId?: string;
  contact_id?: string | null;
  opportunity_id?: string | null;
  customer_name?: string;
  description?: string;
  amount?: number;
  status?: string;
  due_at?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  notes?: string | null;
};

function canUseFinance(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor' || normalized === 'Financeiro';
}

function todayDate() { return new Date().toISOString().slice(0, 10); }
function addDays(days: number) { const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canUseFinance(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para acessar financeiro.' }, { status: 403 });

  const companyId = context.profile.company_id;

  const [{ data: invoices, error: invoicesError }, { data: entries }, { data: wonDeals }] = await Promise.all([
    context.service.from('finance_invoices').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    context.service.from('finance_entries').select('*').eq('company_id', companyId).order('occurred_at', { ascending: false }).limit(50),
    context.service.from('opportunities').select('id, contact_id, title, value, status, updated_at, contacts(name)').eq('company_id', companyId).eq('status', 'Ganha').order('updated_at', { ascending: false }).limit(50)
  ]);

  if (invoicesError) return Response.json({ ok: false, error: invoicesError.message }, { status: 500 });

  return Response.json({ ok: true, invoices: invoices || [], entries: entries || [], wonDeals: wonDeals || [] });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canUseFinance(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para alterar financeiro.' }, { status: 403 });

  let payload: FinancePayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }
  const companyId = context.profile.company_id;
  const action = payload.action || 'create_invoice';

  if (action === 'create_from_won') {
    const { data: wonDeals, error: wonError } = await context.service.from('opportunities').select('id, company_id, contact_id, title, value, status, contacts(name)').eq('company_id', companyId).eq('status', 'Ganha');
    if (wonError) return Response.json({ ok: false, error: wonError.message }, { status: 500 });

    const created: any[] = [];
    for (const deal of wonDeals || []) {
      const { data: existing } = await context.service.from('finance_invoices').select('id').eq('company_id', companyId).eq('opportunity_id', deal.id).limit(1);
      if (existing?.length) continue;
      const contactName = Array.isArray((deal as any).contacts) ? (deal as any).contacts[0]?.name : (deal as any).contacts?.name;
      const { data: invoice } = await context.service.from('finance_invoices').insert({
        company_id: companyId,
        contact_id: deal.contact_id,
        opportunity_id: deal.id,
        customer_name: contactName || 'Cliente sem nome',
        description: deal.title || 'Venda ganha',
        amount: Number(deal.value || 0),
        status: 'Pendente',
        due_at: addDays(7),
        created_by: context.profile.id
      }).select('*').single();
      if (invoice) created.push(invoice);
    }
    await context.service.from('atendimento_audit_logs').insert({ company_id: companyId, actor_profile_id: context.profile.id, action: 'finance_generated_from_won', next_value: { created: created.length } });
    return Response.json({ ok: true, created });
  }

  if (action === 'update_invoice') {
    if (!payload.invoiceId) return Response.json({ ok: false, error: 'Recebimento não informado.' }, { status: 400 });
    const status = payload.status || 'Pendente';
    const updatePayload: any = {
      status,
      due_at: payload.due_at || null,
      paid_at: status === 'Pago' ? (payload.paid_at || todayDate()) : payload.paid_at || null,
      payment_method: payload.payment_method || null,
      notes: payload.notes || null,
      updated_at: new Date().toISOString()
    };

    const { data: invoice, error: updateError } = await context.service.from('finance_invoices').update(updatePayload).eq('id', payload.invoiceId).eq('company_id', companyId).select('*').single();
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });

    if (invoice.status === 'Pago') {
      const { data: existingEntry } = await context.service.from('finance_entries').select('id').eq('company_id', companyId).eq('invoice_id', invoice.id).limit(1);
      if (!existingEntry?.length) {
        await context.service.from('finance_entries').insert({ company_id: companyId, invoice_id: invoice.id, entry_type: 'income', description: invoice.description, amount: invoice.amount, occurred_at: invoice.paid_at || todayDate(), payment_method: invoice.payment_method || 'Não informado', created_by: context.profile.id });
      }
    }

    await context.service.from('atendimento_audit_logs').insert({ company_id: companyId, actor_profile_id: context.profile.id, action: 'finance_invoice_updated', next_value: { invoice: invoice.description, status: invoice.status, amount: invoice.amount } });
    return Response.json({ ok: true, invoice });
  }

  if (!payload.customer_name?.trim() || !payload.description?.trim()) return Response.json({ ok: false, error: 'Cliente e descrição são obrigatórios.' }, { status: 400 });
  const { data: invoice, error: createError } = await context.service.from('finance_invoices').insert({
    company_id: companyId,
    contact_id: payload.contact_id || null,
    opportunity_id: payload.opportunity_id || null,
    customer_name: payload.customer_name.trim(),
    description: payload.description.trim(),
    amount: Number(payload.amount || 0),
    status: payload.status || 'Pendente',
    due_at: payload.due_at || addDays(7),
    paid_at: payload.status === 'Pago' ? (payload.paid_at || todayDate()) : payload.paid_at || null,
    payment_method: payload.payment_method || null,
    notes: payload.notes || null,
    created_by: context.profile.id
  }).select('*').single();

  if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
  return Response.json({ ok: true, invoice });
}
