"use client";

import { useState } from 'react';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void> | void;
};

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('will@clackcrm.com.br');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      await onLogin(email, password);
    } finally {
      setLoading(false);
    }
  }

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

        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Entrar no CRM</h2>
          <p className="notice">Modo MVP: se o Supabase não estiver configurado, qualquer e-mail e senha liberam a demonstração funcional.</p>
          <label>
            E-mail
            <input className="input" type="email" placeholder="will@clackcrm.com.br" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Senha
            <input className="input" type="password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="btn primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
          <button type="button" className="btn ghost">Esqueci minha senha</button>
        </form>
      </div>
    </section>
  );
}
