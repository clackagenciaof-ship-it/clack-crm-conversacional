type LoginProps = {
  onLogin: () => void;
};

export function Login({ onLogin }: LoginProps) {
  return (
    <section className="login">
      <div className="login-card">
        <div className="login-brand">
          <div className="logo-mark">C</div>
          <h1>
            CLACK <span className="gradient-text">CRM</span>
          </h1>
          <p>Venda mais, atenda melhor e acompanhe seu funil em tempo real.</p>
          <div className="login-kpis">
            <div>
              <strong>24/7</strong>
              <span>operação organizada</span>
            </div>
            <div>
              <strong>8</strong>
              <span>etapas comerciais</span>
            </div>
            <div>
              <strong>360º</strong>
              <span>visão do cliente</span>
            </div>
          </div>
        </div>

        <form
          className="login-form"
          onSubmit={(event) => {
            event.preventDefault();
            onLogin();
          }}
        >
          <h2>Entrar no CRM</h2>
          <p className="notice">Modo MVP: use qualquer e-mail e senha para acessar a demonstração funcional.</p>
          <label>
            E-mail
            <input className="input" type="email" placeholder="will@clackcrm.com.br" />
          </label>
          <label>
            Senha
            <input className="input" type="password" placeholder="••••••••" />
          </label>
          <button className="btn primary">Entrar</button>
          <button type="button" className="btn ghost">Esqueci minha senha</button>
        </form>
      </div>
    </section>
  );
}
