import type { Screen, UserRole } from '@/types/crm';
import styles from './FeatureGuide.module.css';

const guides: Record<Screen,{title:string;summary:string;action:string}> = {
  dashboard:{title:'Como usar esta visão',summary:'Comece pelos indicadores e pelas prioridades. Não há gráficos históricos inventados: a tela usa os registros atuais.',action:'Abra pipeline, atendimento ou ONE Core para executar.'},
  leads:{title:'Como usar contatos',summary:'Cadastre cada entrada real uma única vez e mantenha origem, responsável e histórico atualizados.',action:'Do contato você avança para oportunidade, tarefa ou conversa.'},
  kanban:{title:'Como usar o pipeline',summary:'Mantenha somente negócios em andamento na visão principal. Ganhos e perdas ficam preservados para análise.',action:'Toda oportunidade aberta deve ter próxima ação.'},
  tasks:{title:'Como usar tarefas',summary:'Trate vencidas e prioridades antes de criar novas pendências.',action:'Concluir uma tarefa mantém a rotina operacional visível.'},
  messages:{title:'Como usar modelos',summary:'Crie scripts próprios da empresa; contas reais não recebem mensagens fictícias.',action:'Os modelos são consumidos pelo atendimento e pelos fluxos.'},
  inbox:{title:'Como usar atendimento',summary:'Assuma, responda, transfira e resolva conversas dentro da mesma fila.',action:'Use WhatsApp, modelos, fluxos e o Agente Will como apoio.'},
  intelligence:{title:'Como usar o ONE Core',summary:'Leia a operação pelos seis motores: Atende, Entende, Executa, Resolve, Vende e Aprende.',action:'Os sinais vêm do banco e das integrações ativas.'},
  'public-engagement':{title:'Como usar Público 360',summary:'Organize eleitorado agregado, contatos, lideranças, demandas, agenda, eventos e território sem classificar preferência política individual.',action:'Use dados oficiais agregados e comunicação informativa com consentimento.'},
  products:{title:'Como usar catálogo',summary:'Cadastre ofertas reais com preço, cobrança e categoria.',action:'O catálogo alimenta proposta, IA, pipeline e leitura financeira.'},
  reports:{title:'Como usar relatórios',summary:'Analise conversão, receita, origens e execução usando dados da empresa.',action:'Use Imprimir / Salvar em PDF para apresentação.'},
  finance:{title:'Como usar financeiro',summary:'Transforme vendas ganhas em contas a receber e acompanhe recebimentos.',action:'O financeiro começa no pipeline e termina na baixa.'},
  onboarding:{title:'Como usar implantação',summary:'Valide os blocos críticos até a operação estar pronta para o dia a dia.',action:'Empresa, equipe, oferta, funil, atendimento e automações devem conversar.'},
  settings:{title:'Como usar configurações',summary:'Administre empresa, equipe, integrações, automações, marca e permissões.',action:'Mudanças aqui afetam toda a operação.'}
};

export function FeatureGuide({screen,userRole}:{screen:Screen;userRole:UserRole}){
  const guide=guides[screen];
  return <details className={styles.guide}><summary><span>{guide.title}</span><small>guia rápido</small></summary><div className={styles.grid}><div className={styles.item}><b>Leitura</b><p>{guide.summary}</p></div><div className={styles.item}><b>Próximo passo</b><p>{guide.action}</p></div></div><div className={styles.roleNote}><b>{userRole}</b> · acesso e ações respeitam o perfil ativo.</div></details>;
}
