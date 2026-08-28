"use client";

import { useCallback, useState } from 'react';
import { loadCrmSnapshotFromSupabase } from '@/lib/crm/supabase-loader';
import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

type UseCrmRealLoaderParams = {
  setLeads: (leads: Lead[]) => void;
  setDeals: (deals: Opportunity[]) => void;
  setTasks: (tasks: Task[]) => void;
  setMessages: (messages: QuickMessage[]) => void;
};

export function useCrmRealLoader({ setLeads, setDeals, setTasks, setMessages }: UseCrmRealLoaderParams) {
  const [loadingRealData, setLoadingRealData] = useState(false);
  const [dataNotice, setDataNotice] = useState('Aguardando autenticação para carregar dados reais.');

  const clearData = useCallback(() => {
    setLeads([]);
    setDeals([]);
    setTasks([]);
    setMessages([]);
  }, [setDeals, setLeads, setMessages, setTasks]);

  const reloadRealData = useCallback(async () => {
    setLoadingRealData(true);
    try {
      const snapshot = await loadCrmSnapshotFromSupabase();
      if (!snapshot) {
        clearData();
        setDataNotice('Sessão sem empresa vinculada. Nenhum dado fictício foi carregado.');
        return false;
      }

      setLeads(snapshot.leads);
      setDeals(snapshot.deals);
      setTasks(snapshot.tasks);
      setMessages(snapshot.messages);
      setDataNotice('Dados reais sincronizados com o Supabase.');
      return true;
    } catch (error) {
      console.error('Falha ao carregar dados reais.', error);
      clearData();
      setDataNotice('Falha ao sincronizar dados reais. O CRM não substituiu o banco por dados fictícios.');
      return false;
    } finally {
      setLoadingRealData(false);
    }
  }, [clearData, setDeals, setLeads, setMessages, setTasks]);

  return { loadingRealData, dataNotice, setDataNotice, reloadRealData, clearData };
}
