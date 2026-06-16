export const formatCurrency = (amount, currency = 'INR') => {
  const n = Number(amount);
  const value = Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(value);
};

const toDdMmYyyy = (year, month, day) =>
  `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;

/** Display calendar dates as dd-mm-yyyy (IST-safe for YYYY-MM-DD strings). */
export const formatDate = (date) => {
  if (date == null || date === '') return '—';
  const raw = String(date).trim();
  if (/^invalid/i.test(raw)) return '—';

  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) return toDdMmYyyy(isoDate[1], isoDate[2], isoDate[3]);

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  return toDdMmYyyy(d.getFullYear(), d.getMonth() + 1, d.getDate());
};
