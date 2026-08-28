import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CLACK ONE — CRM & Operations',
  description: 'Plataforma multiempresa para captação, atendimento, vendas, automação, execução, financeiro e inteligência operacional.',
  other: { google: 'notranslate' }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <body className="notranslate">{children}</body>
    </html>
  );
}
