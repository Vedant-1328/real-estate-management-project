export const formatCurrency = (amount, currency = 'INR') => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
};

export const formatDate = (date) => {
  if (date == null || date === '') return '—';
  const raw = String(date).trim();
  if (/^invalid/i.test(raw)) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US').format(d);
};
