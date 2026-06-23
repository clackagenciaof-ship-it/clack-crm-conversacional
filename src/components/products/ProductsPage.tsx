"use client";

import { useEffect, useMemo, useState } from 'react';
import { archiveProduct, deleteProduct, loadProducts, saveProduct, type ProductForm, type ProductService, type ProductStat } from '@/lib/crm/products-client';

const emptyForm: ProductForm = { name: '', category: 'Serviço', description: '', price: '', billing_type: 'Único', status: 'Ativo', tags: '' };
const categories = ['Serviço', 'Software', 'Consultoria', 'Plano mensal', 'Produto físico', 'Treinamento', 'Automação'];
const billingTypes = ['Único', 'Mensal', 'Anual', 'Projeto', 'Recorrente'];

function brl(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

export function ProductsPage() {
  const [products, setProducts] = useState<ProductService[]>([]);
  const [stats, setStats] = useState<ProductStat[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh(showAlert = false) {
    setLoading(true);
    try {
      const data = await loadProducts();
      setProducts(data.products);
      setStats(data.stats);
      setCanManage(data.canManage);
      if (showAlert) alert('Produtos e serviços atualizados.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível carregar produtos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const filtered = products.filter((product) => categoryFilter === 'Todas' || product.category === categoryFilter);
  const activeProducts = products.filter((product) => product.status === 'Ativo');
  const monthlyValue = activeProducts.filter((product) => ['Mensal', 'Recorrente'].includes(product.billing_type)).reduce((sum, product) => sum + Number(product.price || 0), 0);
  const totalLinked = stats.reduce((sum, item) => sum + item.opportunities, 0);
  const uniqueCategories = useMemo(() => Array.from(new Set(products.map((product) => product.category))).filter(Boolean), [products]);

  function statFor(productId: string) {
    return stats.find((item) => item.product_id === productId) || { product_id: productId, opportunities: 0, open_value: 0, won_value: 0, invoiced_value: 0 };
  }

  function edit(product: ProductService) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      price: String(product.price || ''),
      billing_type: product.billing_type,
      status: product.status,
      tags: (product.tags || []).join(', ')
    });
  }

  async function submit() {
    if (!form.name.trim()) { alert('Informe o nome do produto ou serviço.'); return; }
    setSaving(true);
    try {
      const saved = await saveProduct(form, editingId || undefined);
      setProducts((current) => editingId ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current]);
      setEditingId(null);
      setForm(emptyForm);
      alert(editingId ? 'Produto atualizado.' : 'Produto criado.');
      refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function archive(id: string) {
    try {
      const updated = await archiveProduct(id);
      setProducts((current) => current.map((item) => item.id === id ? updated : item));
      alert('Produto arquivado.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível arquivar.');
    }
  }

  async function remove(id: string) {
    if (!confirm('Excluir definitivamente este produto/serviço?')) return;
    try {
      await deleteProduct(id);
      setProducts((current) => current.filter((item) => item.id !== id));
      alert('Produto excluído.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível excluir.');
    }
  }

  return <div className="grid" style={{ gap: 16 }}>
    <div className="grid metrics">
      <div className="card metric"><span>Catálogo ativo</span><strong>{activeProducts.length}</strong><small>produtos/serviços</small></div>
      <div className="card metric"><span>Receita mensal base</span><strong>{brl(monthlyValue)}</strong><small>planos recorrentes</small></div>
      <div className="card metric"><span>Categorias</span><strong>{uniqueCategories.length}</strong><small>segmentação comercial</small></div>
      <div className="card metric"><span>Vinculações</span><strong>{totalLinked}</strong><small>oportunidades</small></div>
      <div className="card metric"><span>Ticket médio</span><strong>{brl(activeProducts.length ? activeProducts.reduce((sum, p) => sum + Number(p.price || 0), 0) / activeProducts.length : 0)}</strong><small>catálogo ativo</small></div>
      <div className="card metric"><span>Status</span><strong>Fase 12</strong><small>operacional</small></div>
    </div>

    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title"><div><h2>Catálogo comercial</h2><p className="notice">Produtos e serviços usados em propostas, oportunidades, automações e financeiro.</p></div><span>{loading ? 'carregando' : `${filtered.length} item(ns)`}</span></div>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          <button className="btn" onClick={() => refresh(true)}>Atualizar catálogo</button>
          <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option>Todas</option>{uniqueCategories.map((category) => <option key={category}>{category}</option>)}</select>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {filtered.map((product) => {
            const productStat = statFor(product.id);
            return <div className="message-card" key={product.id}>
              <div className="section-title"><div><strong>{product.name}</strong><p className="notice">{product.category} • {product.billing_type}</p></div><span>{product.status}</span></div>
              <p>{product.description || 'Sem descrição cadastrada.'}</p>
              <div className="deal-meta"><b>{brl(Number(product.price || 0))}</b><span>{productStat.opportunities} oportunidade(s)</span></div>
              <div className="report-bars"><div className="bar"><span><b>Em negociação</b><b>{brl(productStat.open_value)}</b></span><i style={{ width: `${Math.max(8, Math.min(100, productStat.open_value / Math.max(1, product.price || 1) * 15))}%` }} /></div></div>
              {product.tags?.length > 0 && <p className="notice">Tags: {product.tags.join(', ')}</p>}
              {canManage && <div className="deal-actions"><button className="btn small" onClick={() => edit(product)}>Editar</button><button className="btn small" onClick={() => archive(product.id)}>Arquivar</button><button className="btn small danger" onClick={() => remove(product.id)}>Excluir</button></div>}
            </div>;
          })}
          {!filtered.length && <div className="empty">Nenhum produto ou serviço encontrado.</div>}
        </div>
      </div>

      <div className="card pad">
        <div className="section-title"><h2>{editingId ? 'Editar produto/serviço' : 'Novo produto/serviço'}</h2><span>{canManage ? 'Admin/Gestor' : 'somente leitura'}</span></div>
        {!canManage && <p className="notice">Seu perfil visualiza o catálogo, mas não altera produtos.</p>}
        <div className="form-grid">
          <input className="input full" disabled={!canManage} placeholder="Nome do produto/serviço" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <select className="select" disabled={!canManage} value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{categories.map((category) => <option key={category}>{category}</option>)}</select>
          <select className="select" disabled={!canManage} value={form.billing_type} onChange={(event) => setForm({ ...form, billing_type: event.target.value })}>{billingTypes.map((type) => <option key={type}>{type}</option>)}</select>
          <input className="input" disabled={!canManage} type="number" min="0" step="0.01" placeholder="Valor" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
          <select className="select" disabled={!canManage} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option>Ativo</option><option>Inativo</option></select>
          <textarea className="textarea full" disabled={!canManage} placeholder="Descrição comercial" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          <input className="input full" disabled={!canManage} placeholder="Tags separadas por vírgula: premium, mensal, consultoria" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          {canManage && <button className="btn primary full" disabled={saving} onClick={submit}>{saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Criar produto/serviço'}</button>}
          {editingId && <button className="btn full" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancelar edição</button>}
        </div>
        <div className="timeline" style={{ marginTop: 16 }}>
          <div className="timeline-item"><b>Uso comercial</b><p className="notice">Use o catálogo para padronizar proposta, ticket, funil, financeiro e automações por solução vendida.</p></div>
          <div className="timeline-item"><b>Próximo avanço</b><p className="notice">A IA poderá sugerir produto, montar proposta e gerar follow-up com base no interesse do lead.</p></div>
        </div>
      </div>
    </div>
  </div>;
}
