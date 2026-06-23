"use client";

import { useEffect, useState } from 'react';
import { archivePipelineStage, loadCompanyPipelineStages, savePipelineStage, type PipelineStageRow } from '@/lib/crm/pipeline-admin';

type StageForm = {
  id?: string;
  name: string;
  position: number;
  probability: number;
  color: string;
};

const emptyForm: StageForm = { name: '', position: 1, probability: 20, color: '' };

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

  function startEdit(stage: PipelineStageRow) {
    setForm({ id: stage.id, name: stage.name, position: stage.position, probability: Number(stage.probability || 20), color: stage.color || '' });
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
      alert('Não foi possível salvar a etapa do funil.');
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
      alert('Não foi possível arquivar a etapa.');
    }
  }

  const forecastValue = stages.reduce((total, stage) => total + Number(stage.probability || 0), 0);

  return (
    <div className="card pad">
      <div className="section-title">
        <h2>Funil avançado</h2>
        <span>{loading ? 'Carregando...' : `${stages.length} etapa(s)`}</span>
      </div>
      <p className="notice">Crie, organize e ajuste probabilidades das etapas comerciais. O Kanban passa a usar as etapas ativas da empresa.</p>

      <div className="form-grid" style={{ marginTop: 12 }}>
        <input className="input" placeholder="Nome da etapa" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input className="input" type="number" placeholder="Ordem" value={form.position} onChange={(event) => setForm({ ...form, position: Number(event.target.value || 1) })} />
        <input className="input" type="number" placeholder="Probabilidade %" value={form.probability} onChange={(event) => setForm({ ...form, probability: Number(event.target.value || 0) })} />
        <input className="input" placeholder="Cor opcional, ex: #338b85" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
        <button className="btn primary" disabled={saving} onClick={submitStage}>{saving ? 'Salvando...' : form.id ? 'Salvar etapa' : 'Criar etapa'}</button>
        <button className="btn" onClick={() => setForm(emptyForm)}>Limpar</button>
      </div>

      <div className="timeline" style={{ marginTop: 16 }}>
        {stages.map((stage) => (
          <div className="timeline-item" key={stage.id}>
            <b>{stage.position}. {stage.name}</b>
            <p className="notice">Probabilidade: {stage.probability || 0}% • Cor: {stage.color || 'padrão'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn small" onClick={() => startEdit(stage)}>Editar</button>
              <button className="btn small danger" onClick={() => archiveStage(stage)}>Arquivar</button>
            </div>
          </div>
        ))}
        {!stages.length && <div className="empty">Nenhuma etapa ativa encontrada.</div>}
      </div>

      <p className="notice" style={{ marginTop: 12 }}>Soma de probabilidade configurada: {forecastValue} pontos. Use essa régua para deixar o funil mais previsível.</p>
    </div>
  );
}
