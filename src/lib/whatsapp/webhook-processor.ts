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

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function triggerMatches(triggerPhrase: string | null | undefined, body: string) {
  const normalizedBody = normalizeText(body);
  return (triggerPhrase || '')
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean)
    .some((term) => normalizedBody.includes(term));
}

async function sendFlowMessage(supabase: SupabaseServiceClient, companyId: string, conversation: any, step: any) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
  const toPhone = normalizePhone(conversation.customer_phone);
  let sent = false;
  let providerMessageId: string | null = null;
  let status = 'queued';

  if (accessToken && phoneNumberId && toPhone) {
    const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: toPhone, type: 'text', text: { preview_url: false, body: step.message } })
    });
    const data = await response.json().catch(() => null);
    sent = response.ok;
    providerMessageId = response.ok ? data?.messages?.[0]?.id || null : null;
    status = response.ok ? 'sent' : 'failed';
    if (!response.ok) console.error('Falha no envio automático do fluxo WhatsApp.', data);
  }

  const now = new Date().toISOString();
  await supabase.from('whatsapp_messages').insert({
    company_id: companyId,
    conversation_id: conversation.id,
    contact_id: conversation.contact_id || null,
    direction: 'outbound',
    provider_message_id: providerMessageId,
    from_phone: phoneNumberId || null,
    to_phone: toPhone,
    message_type: 'text',
    body: step.message,
    status,
    raw_payload: { source: 'webhook_auto_flow', flow_step_id: step.id, sent },
    created_at: now
  });

  await supabase.from('whatsapp_conversations').update({
    last_message_at: now,
    status: 'Em atendimento',
    updated_at: now
  }).eq('id', conversation.id);

  return sent ? 'Mensagem automática enviada pela Meta.' : 'Mensagem automática registrada; provedor não confirmou envio.';
}

async function executeAutomaticFlowStep(supabase: SupabaseServiceClient, companyId: string, conversation: any, flow: any, session: any, step: any) {
  let result = 'Etapa executada automaticamente.';

  if (step.step_type === 'task') {
    const { data: owner } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    await supabase.from('tasks').insert({
      company_id: companyId,
      contact_id: conversation.contact_id || null,
      owner_id: conversation.assigned_to || owner?.id || null,
      title: `Fluxo automático: ${conversation.customer_name || conversation.customer_phone}`,
      description: step.message,
      type: 'Automação',
      priority: 'Média',
      status: 'Pendente',
      due_at: new Date().toISOString()
    });
    result = 'Tarefa criada automaticamente pelo fluxo.';
  } else {
    result = await sendFlowMessage(supabase, companyId, conversation, step);
  }

  const { data: steps } = await supabase
    .from('chatbot_flow_steps')
    .select('position')
    .eq('company_id', companyId)
    .eq('flow_id', flow.id)
    .gt('position', step.position)
    .limit(1);
  const hasNext = Boolean(steps?.length);
  const now = new Date().toISOString();

  await supabase.from('chatbot_flow_session_events').insert({
    company_id: companyId,
    session_id: session.id,
    flow_id: flow.id,
    step_id: step.id,
    conversation_id: conversation.id,
    step_position: step.position,
    action_type: step.step_type,
    message: step.message,
    status: 'executed',
    result
  });

  await supabase.from('chatbot_flow_sessions').update({
    current_position: step.position,
    last_step_at: now,
    status: hasNext ? 'running' : 'completed',
    completed_at: hasNext ? null : now,
    updated_at: now
  }).eq('id', session.id);

  return true;
}

async function maybeAdvanceAutomaticFlow(supabase: SupabaseServiceClient, companyId: string, message: WhatsAppTextMessage) {
  const customerPhone = normalizePhone(message.from);
  if (!customerPhone) return false;

  const { data: conversations } = await supabase
    .from('whatsapp_conversations')
    .select('*')
    .eq('company_id', companyId)
    .eq('customer_phone', customerPhone)
    .order('updated_at', { ascending: false })
    .limit(1);
  const conversation = conversations?.[0];
  if (!conversation) return false;

  const { data: runningSessions } = await supabase
    .from('chatbot_flow_sessions')
    .select('*')
    .eq('company_id', companyId)
    .eq('conversation_id', conversation.id)
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(1);

  let session = runningSessions?.[0] || null;
  let flow: any = null;

  if (session) {
    const { data } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('company_id', companyId)
      .eq('id', session.flow_id)
      .eq('active', true)
      .maybeSingle();
    flow = data;
  } else {
    const { data: flows } = await supabase
      .from('chatbot_flows')
      .select('*')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('created_at', { ascending: true });

    const body = messageBody(message);
    flow = (flows || []).find((item: any) => triggerMatches(item.trigger_phrase, body)) || null;
    if (!flow) return false;

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('chatbot_flow_sessions')
      .select('id')
      .eq('company_id', companyId)
      .eq('conversation_id', conversation.id)
      .eq('flow_id', flow.id)
      .gte('created_at', sixHoursAgo)
      .limit(1);
    if (recent?.length) return false;

    const { data: created, error } = await supabase.from('chatbot_flow_sessions').insert({
      company_id: companyId,
      flow_id: flow.id,
      conversation_id: conversation.id,
      contact_id: conversation.contact_id || null,
      status: 'running',
      current_position: 0
    }).select('*').single();
    if (error || !created) return false;
    session = created;
  }

  if (!flow || !session) return false;

  const { data: steps } = await supabase
    .from('chatbot_flow_steps')
    .select('*')
    .eq('company_id', companyId)
    .eq('flow_id', flow.id)
    .gt('position', Number(session.current_position || 0))
    .order('position', { ascending: true })
    .limit(1);

  const nextStep = steps?.[0];
  if (!nextStep) {
    await supabase.from('chatbot_flow_sessions').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', session.id);
    return false;
  }

  return executeAutomaticFlowStep(supabase, companyId, conversation, flow, session, nextStep);
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
        if (result === 'created') {
          processedMessages += 1;
          try { await maybeAdvanceAutomaticFlow(supabase, account.company_id, message); } catch (flowError) { console.error('Falha ao avançar fluxo automático.', flowError); }
        }
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
