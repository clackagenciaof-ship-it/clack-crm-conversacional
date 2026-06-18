import { useState, type Dispatch, type SetStateAction } from 'react';
import { Badge } from '@/components/ui/Badge';
import { leadStatusBadgeStyle } from '@/lib/crm/badge-styles';
import { createRealQuickMessage, removeRealQuickMessage, toggleRealQuickMessage, updateRealQuickMessage } from '@/lib/crm/message-persistence';
import type { QuickMessage } from '@/types/crm';

type MessageForm = {
  title: string;
  category: string;
  text: string;
};

type MessagesPageProps = {
  messages: QuickMessage[];
  setMessages: Dispatch<SetStateAction<QuickMessage[]>>;
  copyMessage: (message: QuickMessage) => void;
};

const messageCategories = ['Boas-vindas', 'Primeiro contato', 'Retorno', 'Fechamento', 'Pós-venda'];

function createEditForm(message: QuickMessage): MessageForm {
  return {
    title: message.title,
    category: message.category,
    text: message.text
  };
}

export function MessagesPage({ messages, setMessages, copyMessage }: MessagesPageProps) {
  const [form, setForm] = useState<MessageForm>({ title: '', category: 'Boas-vindas', text: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<MessageForm | null>(null);

  async function addMessage() {
    if (!form.title || !form.text) return alert('Preencha título e texto.');

    try {
      const realMessage = await createRealQuickMessage(form, messages.length);
      if (realMessage) {
        setMessages((currentMessages) => [realMessage, ...currentMessages]);
        setForm({ title: '', category: 'Boas-vindas', text: '' });
        return;
      }
    } catch (error) {
      console.error('Falha ao salvar mensagem rápida real. Usando fallback local.', error);
      alert('Não foi possível salvar no Supabase agora. A mensagem ficará localmente nesta sessão.');
    }

    setMessages((currentMessages) => [
      { id: Date.now(), ...form, active: true },
      ...currentMessages
    ]);
    setForm({ title: '', category: 'Boas-vindas', text: '' });
  }

  async function toggleMessage(message: QuickMessage) {
    try {
      const updatedMessage = await toggleRealQuickMessage(message, messages.findIndex((item) => item.id === message.id) + 1);
      const fallbackMessage = updatedMessage || { ...message, active: !message.active };
      setMessages((currentMessages) =>
        currentMessages.map((item) => (item.id === message.id ? fallbackMessage : item))
      );
      return;
    } catch (error) {
      console.error('Falha ao alternar mensagem real. Atualizando localmente.', error);
    }

    setMessages((currentMessages) =>
      currentMessages.map((item) => (item.id === message.id ? { ...item, active: !item.active } : item))
    );
  }

  function startEdit(message: QuickMessage) {
    setEditingId(message.id);
    setEditForm(createEditForm(message));
  }

  async function saveEdit(message: QuickMessage) {
    if (!editForm?.title || !editForm?.text) return alert('Preencha título e texto.');

    try {
      const updatedMessage = await updateRealQuickMessage(message, { ...editForm, active: message.active }, messages.findIndex((item) => item.id === message.id) + 1);
      const fallbackMessage = updatedMessage || { ...message, ...editForm };
      setMessages((currentMessages) => currentMessages.map((item) => item.id === message.id ? fallbackMessage : item));
      setEditingId(null);
      setEditForm(null);
      return;
    } catch (error) {
      console.error('Falha ao editar mensagem real. Atualizando localmente.', error);
    }

    setMessages((currentMessages) => currentMessages.map((item) => item.id === message.id ? { ...item, ...editForm } : item));
    setEditingId(null);
    setEditForm(null);
  }

  async function removeMessage(message: QuickMessage) {
    const confirmed = window.confirm(`Excluir o modelo "${message.title}"?`);
    if (!confirmed) return;

    try {
      await removeRealQuickMessage(message);
    } catch (error) {
      console.error('Falha ao excluir mensagem real. Removendo localmente.', error);
    }

    setMessages((currentMessages) => currentMessages.filter((item) => item.id !== message.id));
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
              {editingId === message.id && editForm ? (
                <div className="form-grid">
                  <input className="input full" value={editForm.title} onChange={(event) => setEditForm({ ...editForm, title: event.target.value })} />
                  <select className="select full" value={editForm.category} onChange={(event) => setEditForm({ ...editForm, category: event.target.value })}>
                    {messageCategories.map((category) => <option key={category}>{category}</option>)}
                  </select>
                  <textarea className="textarea full" value={editForm.text} onChange={(event) => setEditForm({ ...editForm, text: event.target.value })} />
                  <button className="btn small primary" onClick={() => saveEdit(message)}>Salvar</button>{' '}
                  <button className="btn small" onClick={() => { setEditingId(null); setEditForm(null); }}>Cancelar</button>
                </div>
              ) : (
                <>
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
                    <button className="btn small" onClick={() => startEdit(message)}>Editar</button>{' '}
                    <button className="btn small" onClick={() => toggleMessage(message)}>
                      {message.active ? 'Inativar' : 'Ativar'}
                    </button>{' '}
                    <button className="btn small danger" onClick={() => removeMessage(message)}>Excluir</button>
                  </div>
                </>
              )}
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
