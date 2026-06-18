import { useState, type Dispatch, type SetStateAction } from 'react';
import { Badge } from '@/components/ui/Badge';
import { leadStatusBadgeStyle } from '@/lib/crm/badge-styles';
import type { QuickMessage } from '@/types/crm';

type MessagesPageProps = {
  messages: QuickMessage[];
  setMessages: Dispatch<SetStateAction<QuickMessage[]>>;
  copyMessage: (message: QuickMessage) => void;
};

const messageCategories = ['Boas-vindas', 'Primeiro contato', 'Retorno', 'Fechamento', 'Pós-venda'];

export function MessagesPage({ messages, setMessages, copyMessage }: MessagesPageProps) {
  const [form, setForm] = useState({ title: '', category: 'Boas-vindas', text: '' });

  function addMessage() {
    if (!form.title || !form.text) return alert('Preencha título e texto.');

    setMessages((currentMessages) => [
      { id: Date.now(), ...form, active: true },
      ...currentMessages
    ]);
    setForm({ title: '', category: 'Boas-vindas', text: '' });
  }

  function toggleMessage(messageId: number) {
    setMessages((currentMessages) =>
      currentMessages.map((message) => (message.id === messageId ? { ...message, active: !message.active } : message))
    );
  }

  return (
    <div className="grid two-col">
      <div className="card pad">
        <div className="section-title">
          <h2>Biblioteca de mensagens</h2>
          <span>{messages.length} modelos</span>
        </div>

        <div className="grid">
          {messages.map((message) => (
            <div className="message-card" key={message.id}>
              <div className="section-title">
                <h2>{message.title}</h2>
                <span>{message.category}</span>
              </div>
              <p>{message.text}</p>
              <div>
                <Badge style={leadStatusBadgeStyle(message.active ? 'Cliente' : 'Inativo')}>
                  {message.active ? 'Ativa' : 'Inativa'}
                </Badge>{' '}
                <button className="btn small" onClick={() => copyMessage(message)}>Copiar</button>{' '}
                <button className="btn small" onClick={() => toggleMessage(message.id)}>
                  {message.active ? 'Inativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card pad">
        <h2>Nova mensagem rápida</h2>
        <div className="form-grid">
          <input className="input full" placeholder="Título" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <select className="select full" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            {messageCategories.map((category) => <option key={category}>{category}</option>)}
          </select>
          <textarea className="textarea full" placeholder="Texto da mensagem" value={form.text} onChange={(event) => setForm({ ...form, text: event.target.value })} />
          <button className="btn primary full" onClick={addMessage}>Salvar modelo</button>
        </div>
      </div>
    </div>
  );
}
