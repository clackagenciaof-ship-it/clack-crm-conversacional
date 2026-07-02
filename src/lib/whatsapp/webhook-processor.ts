type SupabaseServiceClient = any;

type WhatsAppTextMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  image?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: Record<string, unknown>;
  video?: { caption?: string };
};

type WhatsAppStatus = {
  id?: string;
  status?: string;
  timestamp?: string;
  recipient_id?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
};

type WhatsAppChange = {
  field?: string;
  value?: {
    messaging_product?: string;
    metadata?: { phone_number_id?: string; display_phone_number?: string };
    contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
    messages?: WhatsAppTextMessage[];
    statuses?: WhatsAppStatus[];
  };
};

type WhatsAppPayload = { entry?: Array<{ id?: string; changes?: WhatsAppChange[] }> };

type InboundProcessResult = 'created' | 'duplicate' | false;

function normalizePhone(phone?: string | null) {
  return (phone || '').replace(/\D/g, '');
}

function messageBody(message: WhatsAppTextMessage) {
  if (message.type === 'text') return message.text?.body || '';
  if (message.type === 'button') return message.button?.text || '[botão recebido]';
  if (message.type === 'interactive') return message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '[resposta interativa recebida]';
  if (message.type === 'image') return message.image?.caption || '[imagem recebida]';
  if (message.type === 'document') return message.document?.caption || message.document?.filename || '[documento recebido]';
  if (message.type === 'audio') return '[áudio recebido]';
  if (message.type === 'video') return message.video?.caption || '[vídeo recebido]';
  return `[${message.type || 'mensagem'} recebida]`;
}

function resolveMessageCreatedAt(timestamp?: string) {
  const now = new Date();
  if (!timestamp) return now.toISOString();

  const providerDate = new Date(Number(timestamp) * 1000);
  const thirtyDaysAgo = now.getTime() - 1000 * 60 * 60 * 24 * 30;
  const tenMinutesAhead = now.getTime() + 1000 * 60 * 10;

  if (Number.isNaN(providerDate.getTime())) return now.toISOString();

  // O payload de teste da Meta usa timestamp antigo fixo. Para a fila do CRM,
  // gravamos a hora atual quando o timestamp do provedor estiver fora de uma janela útil.
  if (providerDate.getTime() < thirtyDaysAgo || providerDate.getTime() > tenMinutesAhead) {
    return now.toISOString();
  }

  return providerDate.toISOString();
}

async function listActiveWhatsAppAccounts(supabase: SupabaseServiceClient) {
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .in('status', ['Ativa', 'active', 'Active']);

  if (error) {
    console.error('Falha ao listar contas WhatsApp ativas.', error);
    return [];
  }

  return data || [];
}

async function findAccountByPhoneNumberId(supabase: SupabaseServiceClient, phoneNumberId?: string) {
  if (!phoneNumberId) return null;
  const { data, error } = await supabase
    .from('whatsapp_accounts')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();

  if (error) {
    console.error('Falha ao buscar conta WhatsApp por Phone Number ID.', error);
    return null;
  }

  return data;
}

async function resolveWhatsAppAccount(params: {
  supabase: SupabaseServiceClient;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  wabaId?: string;
}) {
  const { supabase, phoneNumberId, displayPhoneNumber, wabaId } = params;

  const exactAccount = await findAccountByPhoneNumberId(supabase, phoneNumberId);
  if (exactAccount?.company_id) return exactAccount;

  const activeAccounts = await listActiveWhatsAppAccounts(supabase);
  const normalizedDisplay = normalizePhone(displayPhoneNumber);
  const envPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const envBusinessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  const byDisplayNumber = activeAccounts.find((account: { display_phone_number?: string | null }) => {
    const accountPhone = normalizePhone(account.display_phone_number);
    return normalizedDisplay && accountPhone && (accountPhone.endsWith(normalizedDisplay.slice(-11)) || normalizedDisplay.endsWith(accountPhone.slice(-11)));
  });
  if (byDisplayNumber?.company_id) return byDisplayNumber;

  const byEnv = activeAccounts.find((account: { phone_number_id?: string | null; business_account_id?: string | null }) => {
    return (envPhoneNumberId && account.phone_number_id === envPhoneNumberId) || (envBusinessAccountId && account.business_account_id === envBusinessAccountId) || (wabaId && account.business_account_id === wabaId);
  });
  if (byEnv?.company_id) return byEnv;

  if (activeAccounts.length === 1 && activeAccounts[0]?.company_id) {
    console.warn('Conta WhatsApp resolvida por fallback único. Confira Phone Number ID no CRM.', { phoneNumberId, displayPhoneNumber, wabaId });
    return activeAccounts[0];
  }

  console.warn('Webhook WhatsApp recebido, mas nenhuma conta CRM foi encontrada para o payload.', {
    phoneNumberId,
    displayPhoneNumber,
    wabaId,
    activeAccounts: activeAccounts.length
  });
  return null;
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

async function processInboundMessage(params: { supabase: SupabaseServiceClient; companyId: string; message: WhatsAppTextMessage; displayPhoneNumber?: string; contactName?: string | null }): Promise<InboundProcessResult> {
  const { supabase, companyId, message, displayPhoneNumber, contactName } = params;
  const customerPhone = normalizePhone(message.from);
  if (!customerPhone) return false;

  if (message.id) {
    const { data: duplicate, error: duplicateError } = await supabase
      .from('whatsapp_messages')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider_message_id', message.id)
      .limit(1);
    if (duplicateError) console.error('Falha ao verificar duplicidade de mensagem WhatsApp.', duplicateError);
    if (duplicate?.[0]) return 'duplicate';
  }

  const contact = await findContactByPhone(supabase, companyId, customerPhone);
  const conversation = await findOrCreateConversation({ supabase, companyId, contactId: contact?.id || null, customerPhone, customerName: contact?.name || contactName || null });
  const createdAt = resolveMessageCreatedAt(message.timestamp);
  const body = messageBody(message);
  await supabase.from('whatsapp_messages').insert({ company_id: companyId, conversation_id: conversation.id, contact_id: contact?.id || null, direction: 'inbound', provider_message_id: message.id || null, from_phone: customerPhone, to_phone: displayPhoneNumber || null, message_type: message.type || 'text', body, status: 'received', raw_payload: message, created_at: createdAt });
  await supabase.from('whatsapp_conversations').update({ contact_id: contact?.id || conversation.contact_id || null, customer_name: contact?.name || contactName || conversation.customer_name || null, last_message_at: createdAt, status: conversation.status === 'Arquivada' ? 'Aberta' : conversation.status, updated_at: new Date().toISOString() }).eq('id', conversation.id);
  if (contact?.id) await supabase.from('activity_logs').insert({ company_id: companyId, contact_id: contact.id, type: 'whatsapp_inbound', description: `WhatsApp recebido: ${body}` });
  return 'created';
}

async function processStatusEvent(supabase: SupabaseServiceClient, companyId: string, status: WhatsAppStatus) {
  if (!status.id || !status.status) return false;
  const createdAt = resolveMessageCreatedAt(status.timestamp);
  const error = status.errors?.[0];
  const { error: statusError } = await supabase.from('whatsapp_status_events').insert({ company_id: companyId, provider_message_id: status.id, status: status.status, recipient_phone: normalizePhone(status.recipient_id), payload: status, created_at: createdAt });
  if (statusError) console.error('Falha ao registrar status WhatsApp.', statusError);
  const updatePayload: Record<string, string | null> = { status: status.status };
  if (status.status === 'delivered') updatePayload.delivered_at = createdAt;
  if (status.status === 'read') updatePayload.read_at = createdAt;
  if (error) { updatePayload.error_code = String(error.code || ''); updatePayload.error_message = error.message || error.title || 'Erro WhatsApp'; }
  await supabase.from('whatsapp_messages').update(updatePayload).eq('company_id', companyId).eq('provider_message_id', status.id);
  return true;
}

export async function processWhatsAppWebhookPayload(supabase: SupabaseServiceClient, payload: unknown) {
  const typedPayload = payload as WhatsAppPayload;
  const entries = typedPayload.entry || [];
  const processedCompanyIds = new Set<string>();
  let processedMessages = 0;
  let duplicateMessages = 0;
  let processedStatuses = 0;

  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const metadata = change.value?.metadata;
      const account = await resolveWhatsAppAccount({ supabase, phoneNumberId: metadata?.phone_number_id, displayPhoneNumber: metadata?.display_phone_number, wabaId: entry.id });
      if (!account?.company_id) continue;
      processedCompanyIds.add(account.company_id);
      const contactsByPhone = new Map<string, string | null>();
      for (const contact of change.value?.contacts || []) if (contact.wa_id) contactsByPhone.set(normalizePhone(contact.wa_id), contact.profile?.name || null);
      for (const message of change.value?.messages || []) {
        const result = await processInboundMessage({ supabase, companyId: account.company_id, message, displayPhoneNumber: metadata?.display_phone_number, contactName: contactsByPhone.get(normalizePhone(message.from)) || null });
        if (result === 'created') processedMessages += 1;
        if (result === 'duplicate') duplicateMessages += 1;
      }
      for (const status of change.value?.statuses || []) {
        const didProcess = await processStatusEvent(supabase, account.company_id, status);
        if (didProcess) processedStatuses += 1;
      }
    }
  }

  return { companyId: Array.from(processedCompanyIds)[0] || null, processedMessages, duplicateMessages, processedStatuses };
}
