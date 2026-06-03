export const PAYMENT_MODE_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'neft', label: 'NEFT' },
  { value: 'other', label: 'Other' },
];

export const PAYMENT_MODE_FILTER_OPTIONS = [
  { value: 'all', label: 'All modes' },
  ...PAYMENT_MODE_OPTIONS,
];

export const PAYMENT_MODE_BADGE_CLASS = {
  cash: 'bg-green-100 text-green-800',
  bank: 'bg-blue-100 text-blue-800',
  upi: 'bg-purple-100 text-purple-800',
  cheque: 'bg-amber-100 text-amber-900',
  rtgs: 'bg-indigo-100 text-indigo-800',
  neft: 'bg-cyan-100 text-cyan-900',
  other: 'bg-slate-100 text-slate-700',
};

export const formatPaymentModeLabel = (mode) => {
  if (!mode) return '—';
  const found = PAYMENT_MODE_OPTIONS.find((m) => m.value === mode);
  return found?.label ?? String(mode).replace(/_/g, ' ').toUpperCase();
};
