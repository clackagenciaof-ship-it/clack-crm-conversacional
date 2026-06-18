export function formatCurrencyBRL(value: number) {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function normalizePhoneBR(phone: string) {
  return phone.replace(/\D/g, '');
}

export function createWhatsAppUrl(phone: string, message?: string) {
  const normalized = normalizePhoneBR(phone);
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${normalized}${text}`;
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}
