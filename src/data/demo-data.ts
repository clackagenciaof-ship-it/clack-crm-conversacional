import type { Lead, Opportunity, QuickMessage, Task } from '@/types/crm';

export const demoLeads: Lead[] = [
  { id: 1, name: 'Lucas Pereira', phone: '5598999990001', email: 'lucas@email.com', city: 'Floriano', source: 'Instagram', owner: 'Lucas', temperature: 'Quente', status: 'Lead', lastInteraction: 'há 8 min', tags: ['Prioridade'], history: ['Lead criado via Instagram', 'WhatsApp acionado por Lucas'] },
  { id: 2, name: 'Ana Clara', phone: '5598999990002', email: 'ana@email.com', city: 'Teresina', source: 'WhatsApp', owner: 'Daniela', temperature: 'Quente', status: 'Lead', lastInteraction: 'há 18 min', tags: ['Campanha'], history: ['Atendimento iniciado', 'Mensagem rápida de boas-vindas copiada'] },
  { id: 3, name: 'Isabela Costa', phone: '5598999990003', email: 'isabela@email.com', city: 'Parnaíba', source: 'Indicação', owner: 'Amanda', temperature: 'Morno', status: 'Cliente', lastInteraction: 'hoje', tags: ['Cliente final'], history: ['Oportunidade criada', 'Reunião agendada'] },
  { id: 4, name: 'Marcos Oliveira', phone: '5598999990004', email: 'marcos@email.com', city: 'Picos', source: 'Tráfego Pago', owner: 'Lucas', temperature: 'Frio', status: 'Lead', lastInteraction: 'ontem', tags: ['Retorno'], history: ['Lead qualificado', 'Aguardando orçamento'] },
  { id: 5, name: 'Fernanda Lima', phone: '5598999990005', email: 'fernanda@email.com', city: 'Uruçuí', source: 'Site', owner: 'Daniela', temperature: 'Morno', status: 'Lead', lastInteraction: 'há 2h', tags: ['Site'], history: ['Contato enviado pelo site'] },
  { id: 6, name: 'Rafael Santos', phone: '5598999990006', email: 'rafael@email.com', city: 'Timon', source: 'Blitz', owner: 'Amanda', temperature: 'Quente', status: 'Cliente', lastInteraction: 'há 3h', tags: ['Fechamento'], history: ['Proposta enviada', 'Negociação em andamento'] },
  { id: 7, name: 'Thiago Almeida', phone: '5598999990007', email: 'thiago@email.com', city: 'Barão', source: 'Campanha Comercial', owner: 'Lucas', temperature: 'Quente', status: 'Lead', lastInteraction: 'há 4h', tags: ['Campanha'], history: ['Entrou pela campanha comercial'] },
  { id: 8, name: 'Evelyn Silva', phone: '5598999990008', email: 'evelyn@email.com', city: 'Oeiras', source: 'Instagram', owner: 'Daniela', temperature: 'Frio', status: 'Lead', lastInteraction: 'há 1 dia', tags: ['Frio'], history: ['Mensagem enviada', 'Sem resposta'] },
  { id: 9, name: 'Sérgio Roberto', phone: '5598999990009', email: 'sergio@email.com', city: 'Floriano', source: 'Indicação', owner: 'Amanda', temperature: 'Morno', status: 'Lead', lastInteraction: 'há 2 dias', tags: ['Indicação'], history: ['Contato indicado por cliente'] },
  { id: 10, name: 'Márcio Costa', phone: '5598999990010', email: 'marcio@email.com', city: 'Teresina', source: 'WhatsApp', owner: 'Lucas', temperature: 'Quente', status: 'Lead', lastInteraction: 'agora', tags: ['Prioridade'], history: ['Solicitou proposta pelo WhatsApp'] }
];

export const demoOpportunities: Opportunity[] = [
  { id: 1, leadId: 1, title: 'Plano CRM Start', value: 297, stage: 'Novo Lead', owner: 'Lucas', source: 'Instagram', temperature: 'Quente', nextTask: 'Chamar hoje', late: false, status: 'Aberta', notes: 'Interesse em organizar vendas pelo WhatsApp.' },
  { id: 2, leadId: 2, title: 'Implantação Comercial', value: 1500, stage: 'Primeiro Contato', owner: 'Daniela', source: 'WhatsApp', temperature: 'Quente', nextTask: 'Qualificar demanda', late: false, status: 'Aberta', notes: 'Precisa de funil para equipe de atendimento.' },
  { id: 3, leadId: 3, title: 'CRM Pro', value: 497, stage: 'Qualificação', owner: 'Amanda', source: 'Indicação', temperature: 'Morno', nextTask: 'Reunião 15h', late: false, status: 'Aberta', notes: 'Cliente pediu demonstração.' },
  { id: 4, leadId: 4, title: 'Treinamento + CRM', value: 2500, stage: 'Apresentação Enviada', owner: 'Lucas', source: 'Tráfego Pago', temperature: 'Frio', nextTask: 'Cobrar retorno', late: true, status: 'Aberta', notes: 'Aguardando decisão do gestor.' },
  { id: 5, leadId: 6, title: 'CRM Premium', value: 997, stage: 'Proposta Enviada', owner: 'Amanda', source: 'Blitz', temperature: 'Quente', nextTask: 'Negociar condição', late: false, status: 'Aberta', notes: 'Alta chance de fechamento.' },
  { id: 6, leadId: 7, title: 'Campanha + CRM', value: 3200, stage: 'Negociação', owner: 'Lucas', source: 'Campanha Comercial', temperature: 'Quente', nextTask: 'Enviar contrato', late: false, status: 'Aberta', notes: 'Quer começar ainda esta semana.' },
  { id: 7, leadId: 10, title: 'Assinatura Mensal', value: 397, stage: 'Fechado', owner: 'Lucas', source: 'WhatsApp', temperature: 'Quente', nextTask: 'Onboarding', late: false, status: 'Ganha', notes: 'Fechado em Pix manual.' },
  { id: 8, leadId: 8, title: 'CRM Start', value: 297, stage: 'Perdido', owner: 'Daniela', source: 'Instagram', temperature: 'Frio', nextTask: 'Reativar em 30 dias', late: false, status: 'Perdida', notes: 'Sem orçamento no momento.' }
];

export const demoTasks: Task[] = [
  { id: 1, title: 'Ligar para Lucas Pereira', leadId: 1, owner: 'Lucas', type: 'Ligar', priority: 'Alta', due: 'Hoje 10:00', status: 'Pendente' },
  { id: 2, title: 'Cobrar retorno de Marcos', leadId: 4, owner: 'Lucas', type: 'Cobrar retorno', priority: 'Alta', due: 'Ontem 17:00', status: 'Vencida' },
  { id: 3, title: 'Reunião com Isabela', leadId: 3, owner: 'Amanda', type: 'Reunião', priority: 'Média', due: 'Hoje 15:00', status: 'Em andamento' },
  { id: 4, title: 'Enviar proposta para Rafael', leadId: 6, owner: 'Amanda', type: 'Enviar proposta', priority: 'Alta', due: 'Amanhã 09:00', status: 'Pendente' }
];

export const demoQuickMessages: QuickMessage[] = [
  { id: 1, title: 'Boas-vindas', category: 'Boas-vindas', active: true, text: 'Olá, tudo bem? Aqui é da equipe comercial. Recebemos seu contato e vou te ajudar agora.' },
  { id: 2, title: 'Qualificação', category: 'Primeiro contato', active: true, text: 'Vi que você demonstrou interesse. Posso te fazer algumas perguntas rápidas para entender melhor sua necessidade?' },
  { id: 3, title: 'Retorno de proposta', category: 'Retorno', active: true, text: 'Passando para saber se conseguiu analisar nossa proposta. Posso te ajudar com alguma dúvida?' },
  { id: 4, title: 'Fechamento', category: 'Fechamento', active: true, text: 'Temos uma condição especial disponível hoje. Posso seguir com seu cadastro?' }
];
