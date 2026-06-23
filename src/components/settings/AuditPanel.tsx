"use client";

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

type AuditLog = {
  id: string;
  action: string;
  previous_value?: any;
  next_value?: any;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  company_created: 'Empresa criada',
  company_plan_updated: 'Empresa/plano atualizado',
  company_selected: 'Empresa ativa selecionada',
  user_created: 'Usuário criado',
  user_updated: 'Usuário atualizado',
  user_status_updated: 'Status de usuário alterado',
  user_role_updated: 'Perfil de usuário alterado'
};

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada.');

  return token;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function describeLog(log: AuditLog) {
  const nextValue = log.next_value || {};
  const previousValue = log.previous_value || {};
  const name = nextValue.name || nextValue.email || previousValue.name || previousValue.email || nextValue.company_name || 'Registro administrativo';
  const role = nextValue.role ? ` • ${nextValue.role}` : '';
  const status = nextValue.status ? ` • ${nextValue.status}` : '';
  const plan = nextValue.plan_name ? ` • Plano ${nextValue.plan_name}` : '';
  const limit = nextValue.user_limit ? ` • ${nextValue.user_limit} usuários` : '';
  return `${name}${role}${status}${plan}${limit}`;
}

type AuditPanelProps = {
  refreshKey?: string | number;
};

export function AuditPanel({ refreshKey }: AuditPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadLogs() {
    setLoading(true);
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/audit/list', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        console.warn(result.error || 'Não foi possível carregar auditoria.');
        return;
      }
      setLogs(result.logs || []);
    } catch (error) {
      console.error('Falha ao carregar auditoria.', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [refreshKey]);

  return (
    <div className="card pad">
      <div className="section-title">
        <h2>Auditoria administrativa</h2>
        <span>{loading ? 'Carregando...' : `${logs.length} registro(s)`}</span>
      </div>
      <p className="notice">Histórico das ações importantes feitas em empresas, planos, limites e acessos da equipe.</p>

      <div className="timeline" style={{ marginTop: 16 }}>
        {logs.map((log) => (
          <div className="timeline-item" key={log.id}>
            <b>{actionLabels[log.action] || log.action}</b>
            <p className="notice">{describeLog(log)}</p>
            <small>{formatDate(log.created_at)}</small>
          </div>
        ))}
        {!logs.length && <div className="empty">Nenhuma ação administrativa registrada ainda.</div>}
      </div>

      <button className="btn small" onClick={loadLogs} style={{ marginTop: 12 }}>Atualizar auditoria</button>
    </div>
  );
}
