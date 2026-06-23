"use client";

import { useCallback, useEffect, useState } from 'react';
import { getCrmDataMode, getCrmDataModeLabel } from '@/lib/crm/data-mode';
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
  const [dataNotice, setDataNotice] = useState(getCrmDataModeLabel());

  const reloadRealData = useCallback(async () => {
    if (getCrmDataMode() !== 'real') return false;

    setLoadingRealData(true);
    try {
      const snapshot = await loadCrmSnapshotFromSupabase();
      if (!snapshot) return false;

      setLeads(snapshot.leads);
      setDeals(snapshot.deals);
      setTasks(snapshot.tasks);
      setMessages(snapshot.messages);
      setDataNotice(snapshot.notice);
      return true;
    } catch {
      setDataNotice('Banco preparado, mas usando demonstração como fallback seguro.');
      return false;
    } finally {
      setLoadingRealData(false);
    }
  }, [setDeals, setLeads, setMessages, setTasks]);

  useEffect(() => {
    reloadRealData();
  }, [reloadRealData]);

  return { loadingRealData, dataNotice, reloadRealData };
}
