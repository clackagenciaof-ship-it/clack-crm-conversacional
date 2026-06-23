"use client";

import { useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { ProfileRow } from '@/lib/supabase/crm-repository';

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error('Supabase não configurado.');

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão expirada. Entre novamente no CRM.');

  return token;
}

function buildRecoveryMessage(member: ProfileRow, companyName: string) {
  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://clack-crm-conversacional.vercel.app';
  return [
    `Olá, ${member.name}!`,
    'Para recuperar seu acesso ao CLACK CRM Conversacional:',
    `Empresa: ${companyName}`,
    `E-mail: ${member.email}`,
    `Link: ${appUrl}`,
    'Entre em contato com o Admin Empresa para receber uma nova orientação de acesso.'
  ].join('\n');
}

type UserOnboardingActionsProps = {
  member: ProfileRow;
  companyName: string;
  disabled?: boolean;
};

export function UserOnboardingActions({ member, companyName, disabled }: UserOnboardingActionsProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function copyText(text: string) {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  async function sendAccess() {
    setLoadingAction('access');
    try {
      const token = await getAccessToken();
      const response = await fetch('/api/users/send-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ userId: member.id })
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        alert(result.error || 'Não foi possível preparar o acesso.');
        return;
      }
      await copyText(result.message);
      alert('Mensagem de acesso copiada. Envie ao usuário pelo WhatsApp ou e-mail.');
    } catch (error) {
      console.error('Falha ao enviar acesso.', error);
      alert('Não foi possível preparar o acesso agora.');
    } finally {
      setLoadingAction(null);
    }
  }

  async function copyRecovery() {
    setLoadingAction('recovery');
    try {
      await copyText(buildRecoveryMessage(member, companyName));
      alert('Orientação de recuperação copiada.');
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <>
      <button className="btn small" disabled={disabled || loadingAction === 'access'} onClick={sendAccess}>
        {loadingAction === 'access' ? 'Preparando...' : 'Enviar acesso'}
      </button>
      <button className="btn small" disabled={disabled || loadingAction === 'recovery'} onClick={copyRecovery}>
        {loadingAction === 'recovery' ? 'Copiando...' : 'Recuperar acesso'}
      </button>
    </>
  );
}
