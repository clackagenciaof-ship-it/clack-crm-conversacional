"use client";

import { useState } from 'react';
import styles from './Login.module.css';

const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || '#';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void> | void;
  onDemo?: () => void;
};

export function Login({ onLogin, onDemo }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try { await onLogin(email, password); } finally { setLoading(false); }
  }

  return (
    <section className="login">
      <div className={styles.loginWrap}>
        <div className="login-card">
          <div className="login-brand">
            <div className="logo-mark">C</div>
            <span className="one-kicker">CRM · Atendimento · Automação · Receita</span>
            <h1>CLACK <span className="gradient-text">ONE</span></h1>
            <p>Uma operação única para captar, atender, vender, executar, receber e aprender com dados reais.</p>
            <div className="login-kpis">
              <div><strong>360º</strong><span>cliente e operação</span></div>
              <div><strong>Multi</strong><span>setores e equipes</span></div>
              <div><strong>Real</strong><span>dados por empresa</span></div>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <h2>Acessar operação</h2>
            <p className="notice">Contas de empresa carregam somente dados reais do próprio tenant. A demonstração fica isolada.</p>
            <label>E-mail<input className="input" type="email" autoComplete="email" placeholder="seu e-mail de acesso" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Senha<input className="input" type="password" autoComplete="current-password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
            <button className="btn primary" disabled={loading}>{loading ? 'Conectando...' : 'Entrar com dados reais'}</button>
            {onDemo && <button type="button" className="btn ghost" onClick={onDemo}>Explorar demonstração</button>}
          </form>
        </div>

        <footer className={styles.loginFooter}>
          <div className={styles.footerGrid}>
            <div className={styles.footerColumn}><h3>Produto</h3><span>CLACK ONE</span><span>Atendimento conectado</span><span>Inteligência operacional</span></div>
            <div className={styles.footerColumn}><h3>Suporte</h3><span>Implantação</span><a href={supportWhatsApp} target="_blank" rel="noreferrer">Falar no WhatsApp</a></div>
          </div>
          <div className={styles.footerBottom}><p>© 2026 Clack Growth Company.</p><div className={styles.footerLinks}><span>Termos</span><span>•</span><span>Privacidade</span></div></div>
        </footer>
      </div>
      <a className={styles.whatsappFloat} href={supportWhatsApp} target="_blank" rel="noreferrer" aria-label="Falar com suporte no WhatsApp"><span>WhatsApp</span></a>
    </section>
  );
}
