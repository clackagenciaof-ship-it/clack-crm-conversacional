const permissionProfiles = [
  'Admin Empresa — acesso total',
  'Gestor — equipe, relatórios e funil',
  'Vendedor — próprios leads e oportunidades',
  'Atendente — cadastro e atendimento',
  'Financeiro — vendas fechadas e valores'
];

export function SettingsPage() {
  return (
    <div className="grid two-col">
      <div className="card pad">
        <h2>Empresa</h2>
        <div className="form-grid">
          <input className="input" defaultValue="Clack Growth Company" />
          <input className="input" defaultValue="will@clackcrm.com.br" />
          <input className="input" defaultValue="Nordeste, Sul e Centro-Oeste" />
          <input className="input" defaultValue="Growth, Marketing, Comercial e RH" />
        </div>
      </div>

      <div className="card pad">
        <h2>Perfis e permissões</h2>
        {permissionProfiles.map((profile) => (
          <div className="timeline-item" key={profile}>{profile}</div>
        ))}
      </div>

      <div className="card pad">
        <h2>Módulos em breve</h2>
        <p className="notice">Automação, InfinitePay, API oficial de mensageria, webhooks, white label e IA.</p>
      </div>
    </div>
  );
}
