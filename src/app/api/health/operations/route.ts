import { getAdminRequestContext } from '@/lib/server/clack-admin';

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa não encontrada.' }, { status: 400 });

  const companyId = context.profile.company_id;
  const [account, flows, rules, publicAutomations, scheduledCampaigns, heartbeats] = await Promise.all([
    context.service.from('whatsapp_accounts').select('id,status,display_phone_number').eq('company_id', companyId).maybeSingle(),
    context.service.from('chatbot_flows').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
    context.service.from('automation_rules').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
    context.service.from('public_message_automations').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
    context.service.from('message_campaigns').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'scheduled'),
    context.service.from('system_job_heartbeat').select('*').in('job_name', ['clack-automation-engine','public-message-engine','campaign-engine'])
  ]);

  const heartbeatMap = Object.fromEntries((heartbeats.data || []).map((row: any) => [row.job_name, row]));
  const commercialHeartbeat = heartbeatMap['clack-automation-engine'];
  const publicHeartbeat = heartbeatMap['public-message-engine'];
  const campaignHeartbeat = heartbeatMap['campaign-engine'];
  const fresh = (value?: string | null) => Boolean(value && Date.now() - new Date(value).getTime() < 12 * 60 * 1000);

  return Response.json({
    ok: true,
    runtime: 'online',
    supabase: true,
    whatsapp: {
      account: account.data || null,
      providerConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      webhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN)
    },
    automation: {
      activeFlows: flows.count || 0,
      activeRules: rules.count || 0,
      lastRunAt: commercialHeartbeat?.last_run_at || null,
      engineHealthy: fresh(commercialHeartbeat?.last_run_at)
    },
    publicAutomation: {
      active: publicAutomations.count || 0,
      lastRunAt: publicHeartbeat?.last_run_at || null,
      engineHealthy: fresh(publicHeartbeat?.last_run_at)
    },
    campaigns: {
      scheduled: scheduledCampaigns.count || 0,
      lastRunAt: campaignHeartbeat?.last_run_at || null,
      engineHealthy: fresh(campaignHeartbeat?.last_run_at)
    },
    ai: { enabled: true, engine: 'CLACK Will' }
  });
}
