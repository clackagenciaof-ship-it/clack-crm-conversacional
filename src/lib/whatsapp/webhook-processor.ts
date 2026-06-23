type SupabaseServiceClient = any;

type WhatsAppTextMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
};

type WhatsAppStatus = { id?: string; status?: string; timestamp?: string; recipient_id?: string; errors?: Array<{ code?: number; title?: string; message?: string }> };

type WhatsAppChange = {
  value?: {
    metadata?: { phone_number_id?: string; display_phone_number?: string };
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: WhatsAppTextMessage[];
    statuses?: WhatsAppStatus[];
  };
};

type WhatsAppPayload = { entry?: Array<{ changes?: WhatsAppChange[] }> };

function normalizePhone(phone?: string | null) { return (phone || '').replace(/\D/g, ''); }
function messageBody(message: WhatsAppTextMessage) { return message.type === 'text' ? message.text?.body || '' : `[${message.type || 'mensagem'} recebida]`; }

async function findAccountByPhoneNumberId(supabase: SupabaseServiceClient, phoneNumberId?: string) {
  if (!phoneNumberId) return null;
  const { data, error } = await supabase.from('whatsapp_accounts').select('*').eq('phone_number_id', phoneNumberId).maybeSingle();
  if (error) { console.error('Falha ao buscar conta WhatsApp.', error); return null; }
  return data;
}

async function findContactByPhone(supabase: SupabaseServiceClient, companyId: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;
  const { data, error } = await supabase.from('contacts').select('*').eq('company_id', companyId);
  if (error) { console.error('Falha ao buscar contatos para vincular WhatsApp.', error); return null; }
  return (data || []).find((contact: { phone?: string }) => normalizePhone(contact.phone).endsWith(normalizedPhone.slice(-11))) || null;
}

async function findOrCreateConversation(params: { supabase: SupabaseServiceClient; companyId: string; contactId?: string | null; customerPhone: string; customerName?: string | null }) {
  const { supabase, companyId, contactId, customerPhone, customerName } = params;
  const { data: existing, error: findError } = await supabase.from('whatsapp_conversations').select('*').eq('company_id', companyId).eq('customer_phone', customerPhone).order('updated_at', { ascending: false }).limit(1);
  if (findError) console.error('Falha ao buscar conversa WhatsApp.', findError);
  if (existing?.[0]) return existing[0];
  const { data: created, error: createError } = await supabase.from('whatsapp_conversations').insert({ company_id: companyId, contact_id: contactId || null, customer_phone: customerPhone, customer_name: customerName || null, status: 'Aberta', priority: 'Normal', channel: 'WhatsApp', last_message_at: new Date().toISOString() }).select('*').single();
  if (createError) throw createError;
  return created;
}

async function processInboundMessage(params: { supabase: SupabaseServiceClient; companyId: string; message: WhatsAppTextMessage; displayPhoneNumber?: string; contactName?: string | null }) {
  const { supabase, companyId, message, displayPhoneNumber, contactName } = params;
  const customerPhone = normalizePhone(message.from);
  if (!customerPhone) return;
  const contact = await findContactByPhone(supabase, companyId, customerPhone);
  const conversation = await findOrCreateConversation({ supabase, companyId, contactId: contact?.id || null, customerPhone, customerName: contact?.name || contactName || null });
  const createdAt = message.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString();
  const body = messageBody(message);
  await supabase.from('whatsapp_messages').insert({ company_id: companyId, conversation_id: conversation.id, contact_id: contact?.id || null, direction: 'inbound', provider_message_id: message.id || null, from_phone: customerPhone, to_phone: displayPhoneNumber || null, message_type: message.type || 'text', body, status: 'received', raw_payload: message, created_at: createdAt });
  await supabase.from('whatsapp_conversations').update({ contact_id: contact?.id || conversation.contact_id || null, customer_name: contact?.name || contactName || conversation.customer_name || null, last_message_at: createdAt, status: conversation.status === 'Arquivada' ? 'Aberta' : conversation.status, updated_at: new Date().toISOString() }).eq('id', conversation.id);
  if (contact?.id) await supabase.from('activity_logs').insert({ company_id: companyId, contact_id: contact.id, type: 'whatsapp_inbound', description: `WhatsApp recebido: ${body}` });
}

async function processStatusEvent(supabase: SupabaseServiceClient, companyId: string, status: WhatsAppStatus) {
  if (!status.id || !status.status) return;
  const createdAt = status.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString();
  const error = status.errors?.[0];
  await supabase.from('whatsapp_status_events').insert({ company_id: companyId, provider_message_id: status.id, status: status.status, recipient_phone: normalizePhone(status.recipient_id), payload: status, created_at: createdAt });
  const updatePayload: Record<string, string | null> = { status: status.status };
  if (status.status === 'delivered') updatePayload.delivered_at = createdAt;
  if (status.status === 'read') updatePayload.read_at = createdAt;
  if (error) { updatePayload.error_code = String(error.code || ''); updatePayload.error_message = error.message || error.title || 'Erro WhatsApp'; }
  await supabase.from('whatsapp_messages').update(updatePayload).eq('company_id', companyId).eq('provider_message_id', status.id);
}

export async function processWhatsAppWebhookPayload(supabase: SupabaseServiceClient, payload: unknown) {
  const typedPayload = payload as WhatsAppPayload;
  const entries = typedPayload.entry || [];
  const processedCompanyIds = new Set<string>();
  let processedMessages = 0;
  let processedStatuses = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const metadata = change.value?.metadata;
      const account = await findAccountByPhoneNumberId(supabase, metadata?.phone_number_id);
      if (!account?.company_id) continue;
      processedCompanyIds.add(account.company_id);
      const contactsByPhone = new Map<string, string | null>();
      for (const contact of change.value?.contacts || []) if (contact.wa_id) contactsByPhone.set(normalizePhone(contact.wa_id), contact.profile?.name || null);
      for (const message of change.value?.messages || []) { await processInboundMessage({ supabase, companyId: account.company_id, message, displayPhoneNumber: metadata?.display_phone_number, contactName: contactsByPhone.get(normalizePhone(message.from)) || null }); processedMessages += 1; }
      for (const status of change.value?.statuses || []) { await processStatusEvent(supabase, account.company_id, status); processedStatuses += 1; }
    }
  }

  return { companyId: Array.from(processedCompanyIds)[0] || null, processedMessages, processedStatuses };
}
