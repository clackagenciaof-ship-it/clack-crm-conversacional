import { getAdminRequestContext } from '@/lib/server/clack-admin';
import { normalizeRole } from '@/lib/crm/permissions';

type ProductPayload = {
  action?: 'create' | 'update' | 'archive' | 'delete';
  id?: string;
  name?: string;
  category?: string;
  description?: string;
  price?: number | string;
  billing_type?: string;
  status?: string;
  tags?: string[] | string;
};

function canManageProducts(role: string) {
  const normalized = normalizeRole(role);
  return normalized === 'Admin Empresa' || normalized === 'Gestor';
}

function normalizeTags(tags?: string[] | string) {
  if (Array.isArray(tags)) return tags.map((tag) => tag.trim()).filter(Boolean);
  return (tags || '').split(',').map((tag) => tag.trim()).filter(Boolean);
}

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });

  const companyId = context.profile.company_id;
  const [{ data: products, error: productsError }, { data: opportunities }, { data: invoices }] = await Promise.all([
    context.service.from('product_services').select('*').eq('company_id', companyId).order('created_at', { ascending: false }),
    context.service.from('opportunities').select('id, product_service_id, value, status').eq('company_id', companyId),
    context.service.from('finance_invoices').select('id, product_service_id, amount, status').eq('company_id', companyId)
  ]);

  if (productsError) return Response.json({ ok: false, error: productsError.message }, { status: 500 });

  const stats = (products || []).map((product: any) => {
    const productDeals = (opportunities || []).filter((deal: any) => deal.product_service_id === product.id);
    const productInvoices = (invoices || []).filter((invoice: any) => invoice.product_service_id === product.id);
    return {
      product_id: product.id,
      opportunities: productDeals.length,
      open_value: productDeals.filter((deal: any) => deal.status === 'Aberta').reduce((sum: number, deal: any) => sum + Number(deal.value || 0), 0),
      won_value: productDeals.filter((deal: any) => deal.status === 'Ganha').reduce((sum: number, deal: any) => sum + Number(deal.value || 0), 0),
      invoiced_value: productInvoices.reduce((sum: number, invoice: any) => sum + Number(invoice.amount || 0), 0)
    };
  });

  return Response.json({ ok: true, products: products || [], stats, canManage: canManageProducts(context.profile.role) });
}

export async function POST(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa atual não encontrada.' }, { status: 400 });
  if (!canManageProducts(context.profile.role)) return Response.json({ ok: false, error: 'Perfil sem permissão para gerenciar produtos.' }, { status: 403 });

  let payload: ProductPayload;
  try { payload = await request.json(); } catch { return Response.json({ ok: false, error: 'Payload inválido.' }, { status: 400 }); }

  const companyId = context.profile.company_id;
  const action = payload.action || 'create';

  if (action === 'delete') {
    if (!payload.id) return Response.json({ ok: false, error: 'Produto não informado.' }, { status: 400 });
    const { error: deleteError } = await context.service.from('product_services').delete().eq('company_id', companyId).eq('id', payload.id);
    if (deleteError) return Response.json({ ok: false, error: deleteError.message }, { status: 500 });
    return Response.json({ ok: true, deleted: true });
  }

  if (action === 'archive') {
    if (!payload.id) return Response.json({ ok: false, error: 'Produto não informado.' }, { status: 400 });
    const { data, error: archiveError } = await context.service.from('product_services').update({ status: 'Inativo', updated_at: new Date().toISOString() }).eq('company_id', companyId).eq('id', payload.id).select('*').single();
    if (archiveError) return Response.json({ ok: false, error: archiveError.message }, { status: 500 });
    return Response.json({ ok: true, product: data });
  }

  if (!payload.name?.trim()) return Response.json({ ok: false, error: 'Nome do produto/serviço é obrigatório.' }, { status: 400 });

  const productData = {
    name: payload.name.trim(),
    category: payload.category || 'Serviço',
    description: payload.description || null,
    price: Number(payload.price || 0),
    billing_type: payload.billing_type || 'Único',
    status: payload.status || 'Ativo',
    tags: normalizeTags(payload.tags),
    updated_at: new Date().toISOString()
  };

  if (action === 'update') {
    if (!payload.id) return Response.json({ ok: false, error: 'Produto não informado.' }, { status: 400 });
    const { data, error: updateError } = await context.service.from('product_services').update(productData).eq('company_id', companyId).eq('id', payload.id).select('*').single();
    if (updateError) return Response.json({ ok: false, error: updateError.message }, { status: 500 });
    return Response.json({ ok: true, product: data });
  }

  const { data, error: createError } = await context.service.from('product_services').insert({ ...productData, company_id: companyId, created_by: context.profile.id }).select('*').single();
  if (createError) return Response.json({ ok: false, error: createError.message }, { status: 500 });
  return Response.json({ ok: true, product: data });
}
