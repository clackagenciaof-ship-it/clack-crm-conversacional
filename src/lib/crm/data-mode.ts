import { hasSupabaseConfig } from '@/lib/supabase/client';

export type CrmDataMode = 'demo' | 'real';

export function getCrmDataMode(): CrmDataMode {
  return hasSupabaseConfig() ? 'real' : 'demo';
}

export function getCrmDataModeLabel() {
  return getCrmDataMode() === 'real' ? 'Banco real preparado' : 'Modo demonstração';
}

export function isRealDataMode() {
  return getCrmDataMode() === 'real';
}
