import { getCrmDataMode } from '@/lib/crm/data-mode';
import { mapQuickMessageRowToQuickMessage } from '@/lib/crm/supabase-mappers';
import { createQuickMessage, deleteQuickMessage, getCurrentProfile, updateQuickMessage } from '@/lib/supabase/crm-repository';
import type { QuickMessage } from '@/types/crm';

export type QuickMessageForm = {
  title: string;
  category: string;
  text: string;
  active?: boolean;
};

async function getRealProfileOrNull() {
  if (getCrmDataMode() !== 'real') return null;

  try {
    const profile = await getCurrentProfile();
    if (!profile?.company_id) return null;
    return profile;
  } catch (error) {
    console.error('Nao foi possivel recuperar perfil real.', error);
    return null;
  }
}

export async function createRealQuickMessage(form: QuickMessageForm, index = 0) {
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id) return null;

  const row = await createQuickMessage({
    company_id: profile.company_id,
    title: form.title,
    category: form.category,
    content: form.text,
    active: form.active ?? true
  });

  return mapQuickMessageRowToQuickMessage(row, index);
}

export async function updateRealQuickMessage(message: QuickMessage, form: QuickMessageForm, index = 0) {
  if (!message.dbId) return null;

  const row = await updateQuickMessage(message.dbId, {
    title: form.title,
    category: form.category,
    content: form.text,
    active: form.active ?? message.active
  });

  return mapQuickMessageRowToQuickMessage(row, index);
}

export async function toggleRealQuickMessage(message: QuickMessage, index = 0) {
  if (!message.dbId) return null;

  const row = await updateQuickMessage(message.dbId, {
    active: !message.active
  });

  return mapQuickMessageRowToQuickMessage(row, index);
}

export async function removeRealQuickMessage(message: QuickMessage) {
  if (!message.dbId) return false;
  await deleteQuickMessage(message.dbId);
  return true;
}
