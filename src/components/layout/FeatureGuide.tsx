import type { Screen, UserRole } from '@/types/crm';
import styles from './FeatureGuide.module.css';

type GuideContent = {
  title: string;
  intro: string;
  what: string;
  how: string;
  decision: string;
  roleTip: Partial<Record<UserRole, string>>;
};

const roleFallback: Record<UserRole, string> = {
  'Admin Empresa': 'Use esta área para acompanhar a operação inteira, corrigir rotas e orientar sua equipe com base em dados reais.',
  Gestor: 'Use esta área para acompanhar a equipe, priorizar o que precisa de ação e garantir que o processo comercial esteja andando.',
  Vendedor: 'Use esta área para saber quem atender, qual oportunidade avançar e qual próximo passo executar.',
  Atendente: 'Use esta área para cadastrar, responder, organizar o atendimento e não perder solicitações importantes.',
  Financeiro: 'Use esta área para acompanhar valores, vendas fechadas, previsão e decisões ligadas à receita.'
};

const guideContent: Record<Screen, GuideContent> = {
  dashboard: {
    title: 'Dashboard: visão rápida da operação',
    intro: 'Mostra em poucos segundos se a empresa está vendendo, atendendo e avançando no funil.',
    what: 'Concentra indicadores de leads, oportunidades abertas, vendas fechadas, conversão, valor em negociação e tarefas vencidas.',
    how: 'Comece olhando os cards do topo. Depois veja origem dos leads, temperatura e follow-ups para decidir a ação do dia.',
    decision: 'Onde acelerar: priorize leads quentes, canais que mais geram contatos e oportunidades paradas com maior valor.',
    roleTip: {
      'Admin Empresa': 'Ideal para abrir reunião, apresentar resultado e cobrar avanço da equipe sem depender de planilha.',
      Gestor: 'Use diariamente para decidir quem precisa de suporte e onde o time deve focar primeiro.',
      Vendedor: 'Veja seu ritmo de vendas e busque oportunidades abertas para gerar avanço.',
      Financeiro: 'Acompanhe conversão, vendas fechadas e valor em negociação para prever receita.'
    }
  },
  leads: {
    title: 'Leads: entrada e organização dos contatos',
    intro: 'É a base da venda. Todo contato novo deve virar lead para não se perder no WhatsApp ou na memória da equipe.',
    what: 'Cadastra nome, telefone, origem, cidade, responsável, temperatura e histórico do cliente.',
    how: 'Cadastre o lead, filtre por origem/temperatura/responsável e abra a ficha para registrar evolução, conversa e observações.',
    decision: 'Onde acelerar: leads quentes pedem contato imediato; leads sem responsável precisam ser distribuídos para a equipe.',
    roleTip: {
      'Admin Empresa': 'Use para conferir se a empresa está registrando todos os contatos que chegam.',
      Gestor: 'Acompanhe distribuição por responsável e cobre atualização de temperatura e status.',
      Vendedor: 'Trabalhe seus próprios leads e registre cada contato para manter histórico limpo.',
      Atendente: 'Cadastre rapidamente quem chegou e encaminhe para atendimento ou vendedor.'
    }
  },
  kanban: {
    title: 'Kanban: funil visual de vendas',
    intro: 'Mostra em qual etapa cada oportunidade está e ajuda a equipe a vender com processo, não no improviso.',
    what: 'Organiza oportunidades por etapa, valor, status, responsável, temperatura, origem e próxima ação.',
    how: 'Mova ou edite a oportunidade conforme o avanço: qualificação, proposta, negociação, ganho ou perda.',
    decision: 'Onde acelerar: oportunidades com valor alto, temperatura quente e etapa parada devem virar prioridade do dia.',
    roleTip: {
      'Admin Empresa': 'Use para enxergar gargalos do processo comercial e padronizar etapas por empresa.',
      Gestor: 'Use para acompanhar equipe, cobrar propostas paradas e orientar negociações importantes.',
      Vendedor: 'Use como sua agenda de vendas: tudo que está no funil precisa ter próxima ação.',
      Financeiro: 'Veja vendas ganhas, perdidas e valores em negociação para previsão financeira.'
    }
  },
  tasks: {
    title: 'Tarefas: follow-up e rotina comercial',
    intro: 'Transforma intenção em ação. A tarefa evita que a equipe esqueça retornos, ligações e propostas.',
    what: 'Cria atividades vinculadas a leads, responsáveis, prioridade, prazo e status.',
    how: 'Cadastre tarefas com data clara, conclua quando executar e edite sempre que o próximo passo mudar.',
    decision: 'Onde acelerar: tarefas vencidas ou de alta prioridade devem ser tratadas antes de criar novas ações.',
    roleTip: {
      'Admin Empresa': 'Use para ver se a operação está executando os combinados comerciais.',
      Gestor: 'Acompanhe vencidas, redistribua tarefas e cobre retorno de propostas.',
      Vendedor: 'Use como agenda diária de follow-up para não perder venda por falta de retorno.',
      Atendente: 'Crie lembretes de atendimento, retorno e passagem para vendedor.'
    }
  },
  messages: {
    title: 'Mensagens rápidas e atividades: padrão de resposta',
    intro: 'Padroniza a comunicação para a equipe responder melhor, mais rápido e com o mesmo tom da empresa.',
    what: 'Guarda textos prontos para boas-vindas, proposta, cobrança de retorno, pós-venda, suporte e recuperação de lead.',
    how: 'Crie modelos por categoria, copie para usar no atendimento e mantenha apenas mensagens ativas e revisadas.',
    decision: 'Onde acelerar: mensagens com objeções de preço, retorno de proposta e pós-venda reduzem tempo de atendimento.',
    roleTip: {
      'Admin Empresa': 'Use para padronizar linguagem comercial da empresa.',
      Gestor: 'Revise mensagens usadas pela equipe e mantenha respostas alinhadas ao processo.',
      Vendedor: 'Use para ganhar velocidade sem perder personalização.',
      Atendente: 'Use para responder dúvidas frequentes e registrar atendimento com clareza.'
    }
  },
  inbox: {
    title: 'Atendimento: central de conversas',
    intro: 'Reúne conversas recebidas e permite responder, assumir, transferir, resolver ou arquivar atendimentos.',
    what: 'Controla status da conversa, prioridade, responsável, histórico, respostas rápidas, fluxos e sugestão do Agente Will.',
    how: 'Abra a conversa, assuma ou transfira, use fluxo sugerido, peça sugestão ao Will e registre a resposta no histórico.',
    decision: 'Onde acelerar: conversas abertas sem responsável e clientes aguardando resposta devem ser prioridade máxima.',
    roleTip: {
      'Admin Empresa': 'Use para garantir que nenhum cliente fique sem resposta.',
      Gestor: 'Acompanhe fila, tempo de resposta e distribuição entre atendentes e vendedores.',
      Atendente: 'Use como mesa principal de atendimento para resolver ou encaminhar demandas.',
      Vendedor: 'Use quando uma conversa já estiver pronta para virar oportunidade.'
    }
  },
  products: {
    title: 'Produtos e serviços: catálogo comercial',
    intro: 'Organiza o que a empresa vende para propostas, automações, financeiro e Agente Will trabalharem com referência real.',
    what: 'Cadastra serviços, produtos, preço, tipo de cobrança, descrição, status e tags comerciais.',
    how: 'Mantenha o catálogo limpo, com valores atualizados e descrições claras para facilitar venda e atendimento.',
    decision: 'Onde acelerar: produtos com maior ticket ou maior procura devem alimentar propostas, mensagens e campanhas.',
    roleTip: {
      'Admin Empresa': 'Use para estruturar oferta e evitar que cada vendedor apresente valores diferentes.',
      Gestor: 'Acompanhe quais soluções estão gerando mais oportunidades.',
      Vendedor: 'Use para montar proposta com mais segurança e clareza.',
      Financeiro: 'Use para entender valores de referência e receita potencial.'
    }
  },
  reports: {
    title: 'Relatórios: leitura executiva para decisão',
    intro: 'Transforma dados do CRM em visão gerencial para acompanhar resultado, gargalos e oportunidades de crescimento.',
    what: 'Mostra indicadores premium de vendas, conversão, ticket médio, origem dos leads, temperatura e desempenho comercial.',
    how: 'Analise primeiro os números do topo, depois veja onde há concentração de leads, oportunidades e perda de avanço.',
    decision: 'Onde acelerar: compare conversão, ticket e origem para decidir campanha, treinamento e foco de vendas.',
    roleTip: {
      'Admin Empresa': 'Use para apresentar resultado e tomar decisão de investimento.',
      Gestor: 'Use para orientar equipe e identificar gargalos do funil.',
      Financeiro: 'Use para analisar receita, previsão, ticket médio e vendas fechadas.'
    }
  },
  finance: {
    title: 'Financeiro: vendas, previsão e receita',
    intro: 'Acompanha o dinheiro que já entrou, o que está em negociação e o que pode virar receita.',
    what: 'Organiza vendas fechadas, valores, previsão, ticket, status financeiro e visão de receita por oportunidade.',
    how: 'Confira vendas ganhas, valores em aberto e previsões. Use o financeiro para aproximar comercial e cobrança.',
    decision: 'Onde acelerar: propostas de maior valor e vendas fechadas sem acompanhamento financeiro precisam de atenção.',
    roleTip: {
      'Admin Empresa': 'Use para saber se o comercial está gerando receita real.',
      Gestor: 'Use para alinhar equipe comercial com metas e previsão.',
      Financeiro: 'Use como painel principal de acompanhamento de valores, vendas e recebimentos.'
    }
  },
  onboarding: {
    title: 'Onboarding SaaS: implantação da empresa cliente',
    intro: 'Ajuda a colocar uma nova empresa para usar o CRM com menos dúvida e mais velocidade.',
    what: 'Guia etapas de implantação: empresa, equipe, plano, permissões, produtos, funil, atendimento e automações.',
    how: 'Siga o checklist de ativação e valide se a empresa já consegue cadastrar, vender, atender e acompanhar relatórios.',
    decision: 'Onde acelerar: antes de vender recorrência, garanta que equipe, plano, catálogo e funil estejam configurados.',
    roleTip: {
      'Admin Empresa': 'Use para implantar o CRM no cliente com processo claro.',
      Gestor: 'Use para orientar treinamento da equipe.',
      Atendente: 'Use para entender a rotina inicial de atendimento.'
    }
  },
  settings: {
    title: 'Configurações: controle da operação SaaS',
    intro: 'É a área estratégica para configurar empresa, usuários, planos, permissões, WhatsApp, automações, white label e IA.',
    what: 'Controla equipe, acessos, auditoria, plano, limite de usuários, funil avançado, fluxos, campanhas, marca e Agente Will.',
    how: 'Altere com cuidado: configurações definem como a empresa opera, quem acessa cada módulo e quais recursos ficam ativos.',
    decision: 'Onde acelerar: configure primeiro empresa, equipe, plano, produtos, funil, atendimento e automações básicas.',
    roleTip: {
      'Admin Empresa': 'Use para administrar a empresa cliente e preparar o CRM para venda e uso real.',
      Gestor: 'Use para consultar equipe, regras e organização, sem criar acessos quando essa permissão estiver bloqueada.'
    }
  }
};

export function FeatureGuide({ screen, userRole }: { screen: Screen; userRole: UserRole }) {
  const guide = guideContent[screen];
  const roleTip = guide.roleTip[userRole] || roleFallback[userRole];

  return (
    <details className={styles.guide} open>
      <summary>
        <span>{guide.title}</span>
        <small>Guia rápido para usar esta área</small>
      </summary>
      <div className={styles.grid}>
        <div className={styles.item}><b>Para que serve</b><p>{guide.intro}</p></div>
        <div className={styles.item}><b>O que faz</b><p>{guide.what}</p></div>
        <div className={styles.item}><b>Como usar</b><p>{guide.how}</p></div>
        <div className={styles.item}><b>Leitura executiva</b><p>{guide.decision}</p></div>
      </div>
      <div className={styles.roleNote}><b>{userRole}:</b> {roleTip}</div>
    </details>
  );
}
