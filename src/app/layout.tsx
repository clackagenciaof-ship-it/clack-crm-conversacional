import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CLACK CRM Conversacional',
  description: 'MVP 1 para gestão de leads, atendimento, tarefas e funil comercial.',
  other: {
    google: 'notranslate'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" translate="no" className="notranslate">
      <body className="notranslate">{children}</body>
    </html>
  );
}
