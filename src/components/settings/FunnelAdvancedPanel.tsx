"use client";

import { useEffect, useMemo, useState } from 'react';
import { archivePipelineStage, loadCompanyPipelineStages, savePipelineStage, type PipelineStageRow } from '@/lib/crm/pipeline-admin';

type StageForm = {
  id?: string;
  name: string;
  position: number;
  probability: number;
  color: string;
};

const emptyForm: StageForm = { name: '', position: 1, probability: 20, color: '#338b85' };

const colorOptions = [
  { label: 'Verde Clack', value: '#338b85' },
  { label: 'Turquesa', value: '#5dc1b9' },
  { label: 'Azul', value: '#2563eb' },
  { label: 'Roxo', value: '#7c3aed' },
  { label: 'Laranja', value: '#f97316' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Dourado', value: '#f59e0b' },
  { label: 'Cinza premium', value: '#64748b' }
];

function stageColor(stage?: PipelineStageRow | null) {
  return stage?.color || '#338b85';
}

export function FunnelAdvancedPanel() {
  const [stages, setStages] = useState<PipelineStageRow[]>([]);
  const [form, setForm] = useState<StageForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadStages() {
    setLoading(true);
    try {
      setStages(await loadCompanyPipelineStages());
    } catch (error) {
      console.error('Falha ao carregar etapas do funil.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadStages(); }, []);

  const orderedStages = useMemo(() => [...stages].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)), [stages]);
  const forecastValue = orderedStages.reduce((total, stage) => total + Number(stage.probability || 0), 0);
  const averageProbability = orderedStages.length ? Math.round(forecastValue / orderedStages.length) : 0;

  function startEdit(stage: PipelineStageRow) {
    setForm({ id: stage.id, name: stage.name, position: stage.position, probability: Number(stage.probability || 20), color: stage.color || '#338b85' });
  }

  async function submitStage() {
    if (!form.name.trim()) {
      alert('Informe o nome da etapa.');
      return;
    }

    setSaving(true);
    try {
      await savePipelineStage(form);
      setForm(emptyForm);
      await loadStages();
      alert('Etapa do funil salva.');
    } catch (error) {
      console.error('Falha ao salvar etapa.', error);
      const message = error instanceof Error ? error.message : 'Não foi possível salvar a etapa do funil.';
      alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function archiveStage(stage: PipelineStageRow) {
    if (!window.confirm(`Arquivar a etapa ${stage.name}? As oportunidades existentes continuam preservadas.`)) return;
    try {
      await archivePipelineStage(stage.id);
      await loadStages();
      alert('Etapa arquivada.');
    } catch (error) {
      console.error('Falha ao arquivar etapa.', error);
      const message = error instanceof Error ? error.message : 'Não foi possível arquivar a etapa.';
      alert(message);
    }
  }

  return (
    <div className="card pad" style={{ overflow: 'hidden' }}>
      <div className="section-title" style={{ alignItems: 'flex-start' }}>
        <div>
          <h2>Funil avançado</h2>
          <p className="notice" style={{ marginTop: 6 }}>Organize a jornada comercial com etapas, cores e probabilidades por empresa.</p>
        </div>
        <span>{loading ? 'Carregando...' : `${orderedStages.length} etapa(s)`}</span>
      </div>

      <div className="grid metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginTop: 16 }}>
        <div className="metric"><span>Etapas ativas</span><strong>{orderedStages.length}</strong><small>no funil</small></div>
        <div className="metric"><span>Média de chance</span><strong>{averageProbability}%</strong><small>por etapa</small></div>
        <div className="metric"><span>Última ordem</span><strong>{orderedStages.at(-1)?.position || 0}</strong><small>sequência</small></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.85fr) minmax(320px, 1.15fr)', gap: 18, marginTop: 18 }}>
        <div className="timeline-item" style={{ margin: 0, borderLeftColor: form.color || '#338b85', background: 'linear-gradient(180deg, #ffffff 0%, #f8ffff 100%)' }}>
          <div className="section-title">
            <b>{form.id ? 'Editar etapa' : 'Criar etapa'}</b>
            <span style={{ color: form.color || '#338b85' }}>{form.probability}%</span>
          </div>
          <p className="notice">Defina nome, posição, probabilidade e uma cor para identificação rápida no Kanban.</p>

          <div className="form-grid" style={{ marginTop: 14 }}>
            <input className="input full" placeholder="Nome da etapa, ex: Pós-venda" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <input className="input" type="number" placeholder="Ordem" value={form.position} onChange={(event) => setForm({ ...form, position: Number(event.target.value || 1) })} />
            <input className="input" type="number" placeholder="Probabilidade %" value={form.probability} onChange={(event) => setForm({ ...form, probability: Number(event.target.value || 0) })} />
            <select className="select full" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })}>
              {colorOptions.map((color) => <option key={color.value} value={color.value}>{color.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 12 }}>
            {colorOptions.map((color) => (
              <button
                key={color.value}
                type="button"
                className={form.color === color.value ? 'btn small primary' : 'btn small'}
                onClick={() => setForm({ ...form, color: color.value })}
                style={{ justifyContent: 'flex-start', borderColor: color.value, boxShadow: form.color === color.value ? `0 10px 24px ${color.value}33` : undefined }}
              >
                <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 999, background: color.value, marginRight: 6 }} />
                {color.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <button className="btn primary" disabled={saving} onClick={submitStage}>{saving ? 'Salvando...' : form.id ? 'Salvar etapa' : 'Criar etapa'}</button>
            <button className="btn" onClick={() => setForm(emptyForm)}>Limpar</button>
          </div>
        </div>

        <div className="timeline-item" style={{ margin: 0, background: 'linear-gradient(135deg, #005954 0%, #338b85 48%, #5dc1b9 100%)', color: '#ffffff', borderLeft: 'none' }}>
          <b style={{ color: '#ffffff' }}>Prévia visual do funil</b>
          <p style={{ color: 'rgba(255,255,255,.82)', marginTop: 8 }}>Veja como as etapas ficam organizadas por cor e sequência.</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 18, overflowX: 'auto', paddingBottom: 8 }}>
            {(orderedStages.length ? orderedStages : [{ id: 'preview', name: form.name || 'Nova etapa', position: form.position, probability: form.probability, color: form.color, company_id: '' } as PipelineStageRow]).map((stage) => (
              <div key={stage.id} style={{ minWidth: 148, background: 'rgba(255,255,255,.96)', color: '#053f3b', borderRadius: 18, padding: 14, borderTop: `6px solid ${stageColor(stage)}`, boxShadow: '0 18px 36px rgba(0,0,0,.12)' }}>
                <small>Etapa {stage.position}</small>
                <strong style={{ display: 'block', marginTop: 6 }}>{stage.name}</strong>
                <span style={{ display: 'inline-block', marginTop: 12, padding: '6px 10px', borderRadius: 999, background: `${stageColor(stage)}22`, color: stageColor(stage), fontWeight: 800 }}>{stage.probability || 0}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 18 }}>
        {orderedStages.map((stage) => (
          <div className="timeline-item" key={stage.id} style={{ margin: 0, borderLeftColor: stageColor(stage), background: '#ffffff' }}>
            <div className="section-title">
              <b>{stage.position}. {stage.name}</b>
              <span style={{ color: stageColor(stage) }}>{stage.probability || 0}%</span>
            </div>
            <p className="notice">Cor aplicada: {stage.color || 'padrão Clack'}</p>
            <div style={{ height: 8, borderRadius: 999, background: '#e5f8f6', overflow: 'hidden', margin: '12px 0' }}>
              <div style={{ width: `${Math.min(100, Number(stage.probability || 0))}%`, height: '100%', background: stageColor(stage), borderRadius: 999 }} />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn small" onClick={() => startEdit(stage)}>Editar</button>
              <button className="btn small danger" onClick={() => archiveStage(stage)}>Arquivar</button>
            </div>
          </div>
        ))}
        {!orderedStages.length && <div className="empty">Nenhuma etapa ativa encontrada.</div>}
      </div>

      <p className="notice" style={{ marginTop: 14 }}>Soma de probabilidade configurada: {forecastValue} pontos. Essa régua ajuda a prever o avanço comercial e deixar o Kanban mais profissional.</p>
    </div>
  );
}
