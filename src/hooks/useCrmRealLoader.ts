"use client";

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (getCrmDataMode() !== 'real') return;

      setLoadingRealData(true);
      try {
        const snapshot = await loadCrmSnapshotFromSupabase();
        if (cancelled || !snapshot) return;

        if (snapshot.leads.length) setLeads(snapshot.leads);
        if (snapshot.deals.length) setDeals(snapshot.deals);
        if (snapshot.tasks.length) setTasks(snapshot.tasks);
        if (snapshot.messages.length) setMessages(snapshot.messages);
        setDataNotice(snapshot.notice);
      } catch {
        if (!cancelled) setDataNotice('Banco preparado, mas usando demonstração como fallback seguro.');
      } finally {
        if (!cancelled) setLoadingRealData(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [setDeals, setLeads, setMessages, setTasks]);

  return { loadingRealData, dataNotice };
}
