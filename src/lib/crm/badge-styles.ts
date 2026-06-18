import type { CSSProperties } from 'react';
import type { LeadStatus, LeadTemperature, OpportunityStatus, TaskStatus } from '@/types/crm';

export function tempBadgeStyle(temp: LeadTemperature): CSSProperties {
  const styles: Record<LeadTemperature, CSSProperties> = {
    Quente: { background: '#ffe1d6', color: '#a33a12', borderColor: '#ffb49b' },
    Morno: { background: '#fff2c7', color: '#7a5a00', borderColor: '#f3d36a' },
    Frio: { background: '#dff8ff', color: '#07657a', borderColor: '#9edff0' }
  };

  return styles[temp];
}

export function leadStatusBadgeStyle(status: LeadStatus): CSSProperties {
  const styles: Record<LeadStatus, CSSProperties> = {
    Lead: { background: '#e6f1ff', color: '#22528a', borderColor: '#b9d6f6' },
    Cliente: { background: '#dcf8e9', color: '#0b6b42', borderColor: '#93dfb7' },
    Inativo: { background: '#edf1f1', color: '#5d6d6a', borderColor: '#d0dbd9' },
    Arquivado: { background: '#ebe7f8', color: '#55417a', borderColor: '#d6cdf0' }
  };

  return styles[status];
}

export function taskStatusBadgeStyle(status: TaskStatus): CSSProperties {
  const styles: Record<TaskStatus, CSSProperties> = {
    Pendente: { background: '#fff4cc', color: '#7a5a00', borderColor: '#f1d46e' },
    'Em andamento': { background: '#e1f0ff', color: '#0c5e99', borderColor: '#afd5f6' },
    Concluída: { background: '#dcf8e9', color: '#0b6b42', borderColor: '#93dfb7' },
    Vencida: { background: '#ffe0e0', color: '#9a2727', borderColor: '#f5aaaa' },
    Cancelada: { background: '#edf1f1', color: '#5d6d6a', borderColor: '#d0dbd9' }
  };

  return styles[status];
}

export function opportunityStatusBadgeStyle(status: OpportunityStatus): CSSProperties {
  const styles: Record<OpportunityStatus, CSSProperties> = {
    Aberta: { background: '#e6f1ff', color: '#22528a', borderColor: '#b9d6f6' },
    Ganha: { background: '#dcf8e9', color: '#0b6b42', borderColor: '#93dfb7' },
    Perdida: { background: '#ffe0e0', color: '#9a2727', borderColor: '#f5aaaa' },
    Arquivada: { background: '#edf1f1', color: '#5d6d6a', borderColor: '#d0dbd9' }
  };

  return styles[status];
}
