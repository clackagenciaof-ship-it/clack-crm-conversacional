import { getCrmDataMode } from '@/lib/crm/data-mode';
import { mapContactRowToLead } from '@/lib/crm/supabase-mappers';
import { createActivityLog, deleteContact, getCurrentProfile, updateContact } from '@/lib/supabase/crm-repository';
import type { Lead, LeadStatus, LeadTemperature } from '@/types/crm';

type LeadUpdateForm = {
  name: string;
  phone: string;
  email: string;
  city: string;
  source: string;
  owner: string;
  temperature: LeadTemperature;
  status: LeadStatus;
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

export async function updateRealLead(lead: Lead, form: LeadUpdateForm, index = 0) {
  if (!lead.dbId) return null;
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id) return null;

  const contactRow = await updateContact(lead.dbId, {
    name: form.name,
    phone: form.phone,
    email: form.email || null,
    city: form.city || null,
    origin: form.source,
    temperature: form.temperature,
    status: form.status
  });

  await createActivityLog({
    company_id: profile.company_id,
    contact_id: lead.dbId,
    user_id: profile.id,
    type: 'lead_updated',
    description: `Dados do lead ${form.name} foram atualizados.`
  });

  return {
    ...mapContactRowToLead(contactRow, index),
    id: lead.id,
    owner: form.owner,
    history: [`Dados atualizados no CRM.`, ...lead.history]
  };
}

export async function removeRealLead(lead: Lead) {
  if (!lead.dbId) return false;
  await deleteContact(lead.dbId);
  return true;
}

export async function persistLeadActivity(lead: Lead, description: string, type = 'interaction') {
  if (!lead.dbId) return;
  const profile = await getRealProfileOrNull();
  if (!profile?.company_id) return;

  await createActivityLog({
    company_id: profile.company_id,
    contact_id: lead.dbId,
    user_id: profile.id,
    type,
    description
  });
}
