import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentProfile } from "@/lib/supabase/crm-repository";

export type PublicTerritory = {
  id: string;
  state: string;
  city: string;
  territory_name: string | null;
  electorate_total: number | null;
  source_name: string | null;
  source_date: string | null;
};

export type PublicContact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string;
  state: string;
  neighborhood: string | null;
  consent_status: boolean;
  consent_channel: string | null;
};

export type PublicBroadcast = {
  id: string;
  title: string;
  body: string;
  purpose: "servico" | "evento" | "informacao_publica";
  city: string | null;
  state: string | null;
  status: string;
  created_at: string;
};

async function context() {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error("Usuário sem empresa vinculada.");
  const supabase = createSupabaseBrowserClient() as any;
  if (!supabase) throw new Error("Supabase indisponível.");
  return { companyId: profile.company_id, supabase };
}

export async function loadPublicEngagement() {
  const { companyId, supabase } = await context();
  const [territories, contacts, broadcasts] = await Promise.all([
    supabase.from("public_territories").select("*").eq("company_id", companyId).order("electorate_total", { ascending: false }),
    supabase.from("public_contacts").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(100),
    supabase.from("public_broadcasts").select("*").eq("company_id", companyId).order("created_at", { ascending: false }).limit(50)
  ]);
  if (territories.error) throw territories.error;
  if (contacts.error) throw contacts.error;
  if (broadcasts.error) throw broadcasts.error;
  return {
    territories: (territories.data || []) as PublicTerritory[],
    contacts: (contacts.data || []) as PublicContact[],
    broadcasts: (broadcasts.data || []) as PublicBroadcast[]
  };
}

export async function createPublicTerritory(input: { state: string; city: string; territory_name?: string; electorate_total?: number; source_name?: string }) {
  const { companyId, supabase } = await context();
  const { error } = await supabase.from("public_territories").insert({
    company_id: companyId,
    state: input.state.trim().toUpperCase(),
    city: input.city.trim(),
    territory_name: input.territory_name?.trim() || null,
    electorate_total: Number.isFinite(input.electorate_total) ? input.electorate_total : null,
    source_name: input.source_name?.trim() || null,
    source_date: new Date().toISOString().slice(0, 10)
  });
  if (error) throw error;
}

export async function createPublicContact(input: { name: string; phone?: string; email?: string; city: string; state: string; neighborhood?: string; consent_status: boolean; consent_channel?: string }) {
  const { companyId, supabase } = await context();
  const { error } = await supabase.from("public_contacts").insert({
    company_id: companyId,
    name: input.name.trim(),
    phone: input.phone?.trim() || null,
    email: input.email?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim().toUpperCase(),
    neighborhood: input.neighborhood?.trim() || null,
    consent_status: input.consent_status,
    consent_channel: input.consent_status ? (input.consent_channel?.trim() || "cadastro") : null
  });
  if (error) throw error;
}

export async function createPublicBroadcast(input: { title: string; body: string; purpose: "servico" | "evento" | "informacao_publica"; city?: string; state?: string }) {
  const { companyId, supabase } = await context();
  const { error } = await supabase.from("public_broadcasts").insert({
    company_id: companyId,
    title: input.title.trim(),
    body: input.body.trim(),
    purpose: input.purpose,
    city: input.city?.trim() || null,
    state: input.state?.trim().toUpperCase() || null,
    status: "rascunho"
  });
  if (error) throw error;
}
