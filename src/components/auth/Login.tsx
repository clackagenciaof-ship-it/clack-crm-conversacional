"use client";

import { useState } from 'react';
import styles from './Login.module.css';

const supportWhatsApp = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_URL || '#';

type LoginProps = {
  onLogin: (email: string, password: string) => Promise<void> | void;
};

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <div className={styles.loginWrap}>
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
            <p className="notice">Acesse sua operação comercial, atendimento, funil, automações, financeiro e relatórios em um só lugar.</p>
            <label>
              E-mail
              <input className="input" type="email" placeholder="seu e-mail de acesso" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Senha
              <input className="input" type="password" placeholder="Digite sua senha" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button className="btn primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            <button type="button" className="btn ghost">Esqueci minha senha</button>
          </form>
        </div>

        <footer className={styles.loginFooter}>
          <div className={styles.footerGrid}>
            <div className={styles.footerColumn}>
              <h3>Produto</h3>
              <span>Plataforma</span>
              <span>IA Agente Will</span>
              <span>Planos</span>
            </div>
            <div className={styles.footerColumn}>
              <h3>Suporte</h3>
              <span>Dúvidas</span>
              <a href={supportWhatsApp} target="_blank" rel="noreferrer">Falar no WhatsApp</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 Agência Clack Growth Company. Todos os direitos reservados.</p>
            <div className={styles.footerLinks}>
              <span>Termos</span>
              <span>•</span>
              <span>Privacidade</span>
            </div>
          </div>
        </footer>
      </div>

      <a className={styles.whatsappFloat} href={supportWhatsApp} target="_blank" rel="noreferrer" aria-label="Falar com suporte no WhatsApp">
        <span>WhatsApp</span>
      </a>
    </section>
  );
}
