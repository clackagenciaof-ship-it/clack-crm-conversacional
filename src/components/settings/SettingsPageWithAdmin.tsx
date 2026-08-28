"use client";

import { useEffect, useState } from 'react';
import { AIAgentWillPanel } from './AIAgentWillPanel';
import { AuditPanel } from './AuditPanel';
import { AutomationPanel } from './AutomationPanel';
import { CampaignPanel } from './CampaignPanel';
import { CompanyAdminPanel } from './CompanyAdminPanel';
import { FlowBuilderPanel } from './FlowBuilderPanel';
import { FunnelAdvancedPanel } from './FunnelAdvancedPanel';
import { FutureExpansionPanel } from './FutureExpansionPanel';
import { IntegrationSettingsPanel } from './IntegrationSettingsPanel';
import { SettingsPage as BaseSettingsPage } from './SettingsPage';
import { WhiteLabelPanel } from './WhiteLabelPanel';
import styles from './SettingsPageWithAdmin.module.css';
import type { UserRole } from '@/types/crm';

type SettingsPageProps = {
  currentRole: UserRole;
  currentUserName: string;
  setUserRole: (role: UserRole) => void;
};

type SettingsTab='geral'|'marca'|'integracoes'|'automacoes'|'funil'|'inteligencia'|'roadmap';

const tabs:Array<{key:SettingsTab;label:string;description:string}>=[
  {key:'geral',label:'Empresa & equipe',description:'Acessos, empresa, permissões e WhatsApp'},
  {key:'marca',label:'Marca',description:'Identidade visual e white label'},
  {key:'integracoes',label:'Integrações',description:'Saúde real dos conectores'},
  {key:'automacoes',label:'Automações',description:'Regras, fluxos e campanhas'},
  {key:'funil',label:'Funil',description:'Etapas e regras do pipeline'},
  {key:'inteligencia',label:'IA & auditoria',description:'Agente Will e rastreabilidade'},
  {key:'roadmap',label:'Expansões',description:'Módulos futuros sem poluir a operação'}
];

export function SettingsPage(props: SettingsPageProps) {
  const [tab,setTab]=useState<SettingsTab>('geral');

  useEffect(()=>{
    const hash=typeof window!=='undefined'?window.location.hash.replace('#',''):'';
    if(tabs.some(item=>item.key===hash))setTab(hash as SettingsTab);
  },[]);

  function change(next:SettingsTab){
    setTab(next);
    if(typeof window!=='undefined')window.history.replaceState(null,'',`#${next}`);
  }

  const active=tabs.find(item=>item.key===tab)!;

  return <div className={styles.wrap}>
    <section className={styles.hero}>
      <div>
        <span className="panel-eyebrow">Configuração operacional</span>
        <h2>Organize o sistema por responsabilidade</h2>
        <p>Configurações deixam de ser uma página longa. Cada área tem finalidade, retorno e ação própria.</p>
      </div>
      <div className={styles.heroStatus}><b>{active.label}</b><span>{active.description}</span></div>
    </section>

    <nav className={styles.tabs} aria-label="Áreas de configuração">
      {tabs.map(item=><button key={item.key} className={tab===item.key?styles.active:''} onClick={()=>change(item.key)}>
        <b>{item.label}</b><span>{item.description}</span>
      </button>)}
    </nav>

    <section className={styles.content}>
      {tab==='geral'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Base da operação</span><h3>Empresa, equipe, acessos e canal oficial</h3><p>Defina quem entra, o que cada perfil pode fazer e qual conta de WhatsApp pertence à empresa.</p></div>
        <BaseSettingsPage {...props}/>
        <CompanyAdminPanel/>
      </div>}

      {tab==='marca'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Identidade</span><h3>Marca e white label</h3><p>Aplicação de nome, cores, logo e posicionamento com prévia antes de salvar.</p></div>
        <WhiteLabelPanel/>
      </div>}

      {tab==='integracoes'&&<div className={styles.stack}>
        <IntegrationSettingsPanel/>
      </div>}

      {tab==='automacoes'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Motor de rotina</span><h3>Regras, chatbot e disparos</h3><p>Crie gatilhos, acompanhe execuções e conecte mensagens a tarefas reais.</p></div>
        <AutomationPanel/>
        <FlowBuilderPanel/>
        <CampaignPanel/>
      </div>}

      {tab==='funil'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Pipeline</span><h3>Estrutura comercial</h3><p>Etapas, probabilidades e organização visual do processo de venda.</p></div>
        <FunnelAdvancedPanel/>
      </div>}

      {tab==='inteligencia'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Governança</span><h3>IA operacional e auditoria</h3><p>Use o Agente Will como apoio e acompanhe alterações importantes da plataforma.</p></div>
        <AIAgentWillPanel/>
        <AuditPanel/>
      </div>}

      {tab==='roadmap'&&<div className={styles.stack}>
        <div className={styles.sectionIntro}><span className="panel-eyebrow">Expansão</span><h3>O que pode crescer depois</h3><p>Recursos futuros ficam isolados do que já está pronto para uso e venda.</p></div>
        <FutureExpansionPanel/>
      </div>}
    </section>
  </div>;
}
