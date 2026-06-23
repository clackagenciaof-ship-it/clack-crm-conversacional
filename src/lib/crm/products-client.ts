import { createSupabaseBrowserClient } from '@/lib/supabase/client';

export type ProductService = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  billing_type: string;
  status: string;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type ProductStat = {
  product_id: string;
  opportunities: number;
  open_value: number;
  won_value: number;
  invoiced_value: number;
};

export type ProductForm = {
  name: string;
  category: string;
  description: string;
  price: string;
  billing_type: string;
  status: string;
  tags: string;
};

async function getSessionHeader() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente.');
  return { Authorization: `Bearer ${token}` };
}

export async function loadProducts() {
  const response = await fetch('/api/products', { headers: await getSessionHeader() });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível carregar produtos.');
  return { products: (result.products || []) as ProductService[], stats: (result.stats || []) as ProductStat[], canManage: Boolean(result.canManage) };
}

export async function saveProduct(form: ProductForm, id?: string) {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({
      action: id ? 'update' : 'create',
      id,
      name: form.name,
      category: form.category,
      description: form.description,
      price: Number(form.price || 0),
      billing_type: form.billing_type,
      status: form.status,
      tags: form.tags
    })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível salvar produto.');
  return result.product as ProductService;
}

export async function archiveProduct(id: string) {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'archive', id })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível arquivar produto.');
  return result.product as ProductService;
}

export async function deleteProduct(id: string) {
  const response = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await getSessionHeader()) },
    body: JSON.stringify({ action: 'delete', id })
  });
  const result = await response.json();
  if (!response.ok || !result.ok) throw new Error(result.error || 'Não foi possível excluir produto.');
  return true;
}
