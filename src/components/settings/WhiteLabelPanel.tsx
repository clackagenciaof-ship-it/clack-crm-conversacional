"use client";

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { applyBranding, defaultBranding, loadBranding, saveBranding, type CompanyBranding } from '@/lib/crm/branding-client';

const palettes = [
  { name: 'Clack Verde', primary: '#005954', secondary: '#338b85', accent: '#5dc1b9', bg: '#f4fffe' },
  { name: 'Premium Azul', primary: '#0f2f4a', secondary: '#1f6f8b', accent: '#47b5d6', bg: '#f3fbff' },
  { name: 'Executivo Preto', primary: '#111827', secondary: '#374151', accent: '#9ca3af', bg: '#f8fafc' },
  { name: 'Comercial Roxo', primary: '#32115f', secondary: '#6d28d9', accent: '#a78bfa', bg: '#fbf8ff' },
  { name: 'Energia Laranja', primary: '#7c2d12', secondary: '#ea580c', accent: '#fb923c', bg: '#fff8f1' }
];

export function WhiteLabelPanel() {
  const [branding, setBranding] = useState<CompanyBranding>(defaultBranding);
  const [canManage, setCanManage] = useState(false);
  const [saving, setSaving] = useState(false);

  async function refresh() {
    try {
      const data = await loadBranding();
      setBranding({ ...defaultBranding, ...data.branding });
      setCanManage(data.canManage);
      applyBranding({ ...defaultBranding, ...data.branding });
    } catch {
      setBranding(defaultBranding);
    }
  }

  useEffect(() => { refresh(); }, []);

  function update(field: keyof CompanyBranding, value: string | boolean) {
    const next = { ...branding, [field]: value } as CompanyBranding;
    setBranding(next);
    applyBranding(next);
  }

  function applyPalette(palette: typeof palettes[number]) {
    const next = { ...branding, primary_color: palette.primary, secondary_color: palette.secondary, accent_color: palette.accent, background_color: palette.bg, sidebar_color: palette.primary };
    setBranding(next);
    applyBranding(next);
  }

  function handleLogoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      alert('Envie uma imagem PNG, JPG, WEBP ou SVG.');
      return;
    }
    if (file.size > 650 * 1024) {
      alert('A imagem precisa ter até 650 KB para salvar com segurança no white label.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (!result) return;
      update('logo_url', result);
    };
    reader.readAsDataURL(file);
  }

  async function submit() {
    setSaving(true);
    try {
      const saved = await saveBranding(branding);
      setBranding({ ...defaultBranding, ...saved });
      applyBranding({ ...defaultBranding, ...saved });
      alert('White label salvo e aplicado.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Não foi possível salvar white label.');
    } finally {
      setSaving(false);
    }
  }

  return <div className="card pad">
    <div className="section-title"><div><h2>White label</h2><p className="notice">Personalize nome, marca, cores, promessa comercial e domínio por empresa cliente.</p></div><span>Fase 14</span></div>
    <div className="grid two-col" style={{ marginTop: 0 }}>
      <div>
        <div className="form-grid">
          <input className="input" disabled={!canManage} value={branding.app_name} onChange={(event) => update('app_name', event.target.value)} placeholder="Nome do app" />
          <input className="input" disabled={!canManage} value={branding.brand_name} onChange={(event) => update('brand_name', event.target.value)} placeholder="Nome da marca" />
          <label className="input full" style={{ display: 'grid', gap: 8, cursor: canManage ? 'pointer' : 'not-allowed' }}>
            <b>Logo da empresa</b>
            <span className="notice">Envie PNG/JPG/WEBP/SVG até 650 KB ou cole uma URL abaixo.</span>
            <input disabled={!canManage} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={handleLogoUpload} />
          </label>
          <input className="input full" disabled={!canManage} value={branding.logo_url || ''} onChange={(event) => update('logo_url', event.target.value)} placeholder="URL da logo ou imagem enviada" />
          <input className="input full" disabled={!canManage} value={branding.custom_domain || ''} onChange={(event) => update('custom_domain', event.target.value)} placeholder="Domínio/subdomínio futuro" />
          <input className="input full" disabled={!canManage} value={branding.welcome_title} onChange={(event) => update('welcome_title', event.target.value)} placeholder="Título comercial" />
          <textarea className="textarea full" disabled={!canManage} value={branding.welcome_subtitle} onChange={(event) => update('welcome_subtitle', event.target.value)} placeholder="Subtítulo de posicionamento" />
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 14 }}>
          <label className="notice">Primária<input className="input" disabled={!canManage} value={branding.primary_color} onChange={(event) => update('primary_color', event.target.value)} /></label>
          <label className="notice">Secundária<input className="input" disabled={!canManage} value={branding.secondary_color} onChange={(event) => update('secondary_color', event.target.value)} /></label>
          <label className="notice">Destaque<input className="input" disabled={!canManage} value={branding.accent_color} onChange={(event) => update('accent_color', event.target.value)} /></label>
          <label className="notice">Fundo<input className="input" disabled={!canManage} value={branding.background_color} onChange={(event) => update('background_color', event.target.value)} /></label>
        </div>
        <div className="deal-actions" style={{ marginTop: 14 }}>
          {palettes.map((palette) => <button className="btn small" key={palette.name} disabled={!canManage} onClick={() => applyPalette(palette)}>{palette.name}</button>)}
        </div>
        <div className="deal-actions" style={{ marginTop: 14 }}>
          {canManage && <button className="btn" onClick={() => update('logo_url', '')}>Remover logo</button>}
          {canManage && <button className="btn primary" style={{ flex: 1 }} disabled={saving} onClick={submit}>{saving ? 'Salvando...' : 'Salvar white label'}</button>}
        </div>
      </div>
      <div className="card pad" style={{ background: `linear-gradient(135deg, ${branding.primary_color}, ${branding.secondary_color}, ${branding.accent_color})`, color: '#fff' }}>
        {branding.logo_url ? <img src={branding.logo_url} alt={branding.brand_name} style={{ width: 78, height: 78, objectFit: 'contain', background: 'rgba(255,255,255,.92)', borderRadius: 22, padding: 8, marginBottom: 18 }} /> : <div className="logo-mark" style={{ marginBottom: 18 }}>{branding.app_name?.slice(0, 1) || 'C'}</div>}
        <h2 style={{ color: '#fff', marginTop: 0 }}>{branding.brand_name}</h2>
        <p style={{ color: 'rgba(255,255,255,.88)' }}>{branding.welcome_title}</p>
        <p style={{ color: 'rgba(255,255,255,.76)' }}>{branding.welcome_subtitle}</p>
        <div className="timeline-item" style={{ color: 'var(--text)' }}><b>Pronto para vender como SaaS</b><p className="notice">Cada empresa pode operar com identidade própria sem misturar dados.</p></div>
      </div>
    </div>
  </div>;
}
