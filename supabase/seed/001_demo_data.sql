-- CLACK CRM Conversacional — dados iniciais de demonstração
-- Antes de executar: crie um usuário em Authentication > Users no Supabase.
-- Depois copie o ID do usuário e substitua o valor abaixo.

-- 1) Troque este valor pelo ID real do usuário criado no Supabase Auth.
-- Exemplo: select '00000000-0000-0000-0000-000000000000'::uuid;

with params as (
  select
    '00000000-0000-0000-0000-000000000000'::uuid as user_id,
    'Will Sampaio'::text as user_name,
    'will@clackcrm.com.br'::text as user_email
), inserted_company as (
  insert into companies (name, email, city, state, segment, status)
  values ('Clack Growth Company', 'will@clackcrm.com.br', 'Teresina', 'PI', 'Growth, Marketing, Comercial e CRM', 'active')
  returning id
), inserted_profile as (
  insert into profiles (id, company_id, name, email, role, status)
  select params.user_id, inserted_company.id, params.user_name, params.user_email, 'admin', 'active'
  from params, inserted_company
  on conflict (id) do update set
    company_id = excluded.company_id,
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    status = excluded.status
  returning company_id
), inserted_pipeline as (
  insert into pipelines (company_id, name, is_default, status)
  select company_id, 'Funil Comercial Principal', true, 'active'
  from inserted_profile
  returning id, company_id
), inserted_stages as (
  insert into pipeline_stages (company_id, pipeline_id, name, position, status)
  select inserted_pipeline.company_id, inserted_pipeline.id, stage.name, stage.position, 'active'
  from inserted_pipeline,
  (values
    ('Novo Lead', 1),
    ('Primeiro Contato', 2),
    ('Qualificação', 3),
    ('Apresentação Enviada', 4),
    ('Proposta Enviada', 5),
    ('Negociação', 6),
    ('Fechado', 7),
    ('Perdido', 8)
  ) as stage(name, position)
  returning id, company_id, pipeline_id, name
), inserted_contacts as (
  insert into contacts (company_id, owner_id, name, phone, email, city, state, origin, temperature, status, notes)
  select inserted_profile.company_id, params.user_id, contact.name, contact.phone, contact.email, contact.city, contact.state, contact.origin, contact.temperature, contact.status, contact.notes
  from inserted_profile, params,
  (values
    ('Lucas Pereira', '5598999990001', 'lucas@email.com', 'Floriano', 'PI', 'Instagram', 'Quente', 'Lead', 'Lead criado via Instagram.'),
    ('Ana Clara', '5598999990002', 'ana@email.com', 'Teresina', 'PI', 'WhatsApp', 'Quente', 'Lead', 'Atendimento iniciado pelo WhatsApp.'),
    ('Isabela Costa', '5598999990003', 'isabela@email.com', 'Parnaíba', 'PI', 'Indicação', 'Morno', 'Cliente', 'Cliente indicado por parceiro.'),
    ('Marcos Oliveira', '5598999990004', 'marcos@email.com', 'Picos', 'PI', 'Tráfego Pago', 'Frio', 'Lead', 'Aguardando retorno.'),
    ('Fernanda Lima', '5598999990005', 'fernanda@email.com', 'Uruçuí', 'PI', 'Site', 'Morno', 'Lead', 'Contato enviado pelo site.'),
    ('Rafael Santos', '5598999990006', 'rafael@email.com', 'Timon', 'MA', 'Blitz', 'Quente', 'Cliente', 'Negociação avançada.')
  ) as contact(name, phone, email, city, state, origin, temperature, status, notes)
  on conflict (company_id, phone) do update set
    name = excluded.name,
    email = excluded.email,
    city = excluded.city,
    state = excluded.state,
    origin = excluded.origin,
    temperature = excluded.temperature,
    status = excluded.status,
    notes = excluded.notes
  returning id, company_id, owner_id, name, origin, temperature
), inserted_opportunities as (
  insert into opportunities (company_id, contact_id, pipeline_id, stage_id, owner_id, title, value, temperature, status, product_interest, notes)
  select
    contact.company_id,
    contact.id,
    pipeline.id,
    stage.id,
    contact.owner_id,
    opportunity.title,
    opportunity.value,
    contact.temperature,
    opportunity.status,
    opportunity.product_interest,
    opportunity.notes
  from inserted_contacts contact
  join inserted_pipeline pipeline on pipeline.company_id = contact.company_id
  join inserted_stages stage on stage.company_id = contact.company_id and stage.name = opportunity.stage_name
  join (values
    ('Lucas Pereira', 'Plano CRM Start', 297.00, 'Novo Lead', 'Aberta', 'CRM Start', 'Interesse em organizar vendas pelo WhatsApp.'),
    ('Ana Clara', 'Implantação Comercial', 1500.00, 'Primeiro Contato', 'Aberta', 'Implantação', 'Precisa de funil para equipe de atendimento.'),
    ('Isabela Costa', 'CRM Pro', 497.00, 'Qualificação', 'Aberta', 'CRM Pro', 'Cliente pediu demonstração.'),
    ('Marcos Oliveira', 'Treinamento + CRM', 2500.00, 'Apresentação Enviada', 'Aberta', 'Treinamento Comercial', 'Aguardando decisão do gestor.'),
    ('Fernanda Lima', 'Assinatura Mensal', 397.00, 'Proposta Enviada', 'Aberta', 'CRM Mensal', 'Proposta enviada.'),
    ('Rafael Santos', 'CRM Premium', 997.00, 'Negociação', 'Aberta', 'CRM Premium', 'Alta chance de fechamento.')
  ) as opportunity(contact_name, title, value, stage_name, status, product_interest, notes)
  on opportunity.contact_name = contact.name
  returning id, company_id, contact_id, owner_id
), inserted_tasks as (
  insert into tasks (company_id, contact_id, opportunity_id, owner_id, title, description, type, priority, due_at, status)
  select company_id, contact_id, id, owner_id, 'Follow-up comercial', 'Acompanhar evolução da oportunidade.', 'Ligar', 'Média', now() + interval '1 day', 'Pendente'
  from inserted_opportunities
  returning id
)
insert into quick_messages (company_id, title, category, content, active)
select inserted_profile.company_id, message.title, message.category, message.content, true
from inserted_profile,
(values
  ('Boas-vindas', 'Boas-vindas', 'Olá, tudo bem? Aqui é da equipe comercial. Recebemos seu contato e vou te ajudar agora.'),
  ('Qualificação', 'Primeiro contato', 'Vi que você demonstrou interesse. Posso te fazer algumas perguntas rápidas para entender melhor sua necessidade?'),
  ('Retorno de proposta', 'Retorno', 'Passando para saber se conseguiu analisar nossa proposta. Posso te ajudar com alguma dúvida?'),
  ('Fechamento', 'Fechamento', 'Temos uma condição especial disponível hoje. Posso seguir com seu cadastro?')
) as message(title, category, content);
