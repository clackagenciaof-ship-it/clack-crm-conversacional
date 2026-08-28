import { getAdminRequestContext } from '@/lib/server/clack-admin';

export async function GET(request: Request) {
  const { context, error } = await getAdminRequestContext(request);
  if (error) return error;
  if (!context?.profile.company_id) return Response.json({ ok: false, error: 'Empresa não encontrada.' }, { status: 400 });

  const companyId = context.profile.company_id;
  const [account, flows, rules] = await Promise.all([
    context.service.from('whatsapp_accounts').select('id,status,display_phone_number').eq('company_id', companyId).maybeSingle(),
    context.service.from('chatbot_flows').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true),
    context.service.from('automation_rules').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('active', true)
  ]);

  return Response.json({
    ok: true,
    runtime: 'online',
    supabase: true,
    whatsapp: {
      account: account.data || null,
      providerConfigured: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      webhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN)
    },
    automation: { activeFlows: flows.count || 0, activeRules: rules.count || 0 },
    ai: { enabled: true, engine: 'CLACK Will' }
  });
}
