import { createWhatsAppAccount, getCurrentProfile, listWhatsAppAccounts, updateWhatsAppAccount } from '@/lib/supabase/crm-repository';

export type WhatsAppAccount = {
  id: string;
  company_id: string;
  phone_number_id: string;
  display_phone_number?: string | null;
  business_account_id?: string | null;
  status: string;
  created_at?: string;
  updated_at?: string;
};

export type WhatsAppAccountForm = {
  phone_number_id: string;
  display_phone_number: string;
  business_account_id: string;
  status: string;
};

export const initialWhatsAppAccountForm: WhatsAppAccountForm = {
  phone_number_id: '',
  display_phone_number: '',
  business_account_id: '',
  status: 'Ativa'
};

export function formFromWhatsAppAccount(account: WhatsAppAccount): WhatsAppAccountForm {
  return {
    phone_number_id: account.phone_number_id || '',
    display_phone_number: account.display_phone_number || '',
    business_account_id: account.business_account_id || '',
    status: account.status || 'Ativa'
  };
}

export async function loadWhatsAppAccounts() {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) return [];

  return listWhatsAppAccounts(profile.company_id) as Promise<WhatsAppAccount[]>;
}

export async function saveWhatsAppAccount(form: WhatsAppAccountForm, account?: WhatsAppAccount | null) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error('Empresa não vinculada ao usuário atual.');

  const payload = {
    company_id: profile.company_id,
    phone_number_id: form.phone_number_id.trim(),
    display_phone_number: form.display_phone_number.trim() || null,
    business_account_id: form.business_account_id.trim() || null,
    status: form.status
  };

  if (account?.id) {
    return updateWhatsAppAccount(account.id, payload) as Promise<WhatsAppAccount>;
  }

  return createWhatsAppAccount(payload) as Promise<WhatsAppAccount>;
}
