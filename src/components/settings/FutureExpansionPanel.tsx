export function FutureExpansionPanel() {
  const active = [
    'Automações comerciais',
    'Fluxos e chatbot assistido',
    'WhatsApp Cloud API preparado',
    'Webhooks',
    'White label',
    'IA Agente Will',
    'Financeiro',
    'Produtos e serviços',
    'Relatórios premium',
    'Onboarding SaaS'
  ];

  const next = [
    'RH e gestão de pessoas',
    'Estoque e inventário',
    'Compras e fornecedores',
    'Contratos e propostas digitais',
    'Agenda de serviços',
    'NPS e satisfação do cliente',
    'Portal do cliente',
    'BI avançado',
    'Educação corporativa',
    'Gestão de projetos'
  ];

  return (
    <div className="card pad" style={{ marginBottom: 16 }}>
      <div className="section-title">
        <div>
          <h2>Plataforma pronta para operação</h2>
          <p className="notice">O que já está criado fica abaixo. O roadmap mostra apenas expansões futuras para vender planos maiores.</p>
        </div>
        <span>SaaS ativo</span>
      </div>

      <div className="grid two-col" style={{ marginTop: 0 }}>
        <div className="timeline-item">
          <b>Recursos já ativos no CRM</b>
          <div className="deal-actions" style={{ marginTop: 12 }}>
            {active.map((item) => <span className="badge status" key={item}>{item}</span>)}
          </div>
        </div>
        <div className="timeline-item">
          <b>Próximas ampliações comerciais</b>
          <p className="notice">Ideias para evoluir além de comercial, marketing e atendimento.</p>
          <div className="deal-actions" style={{ marginTop: 12 }}>
            {next.map((item) => <span className="badge" key={item}>{item}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}
