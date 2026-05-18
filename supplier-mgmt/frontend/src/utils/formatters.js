export const formatCurrency = (amount, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount ?? 0);

export const formatDate = (date) =>
  date ? new Intl.DateTimeFormat('en-US').format(new Date(date)) : '—';
