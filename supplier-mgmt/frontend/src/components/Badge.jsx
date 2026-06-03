const variants = {
  default: 'bg-slate-100 text-slate-700 ring-slate-200/80',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200/80',
  info: 'bg-sky-50 text-sky-800 ring-sky-200/80',
  warning: 'bg-amber-50 text-amber-900 ring-amber-200/80',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200/80',
};

export default function Badge({ children, variant = 'default' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        variants[variant] || variants.default
      }`}
    >
      {children}
    </span>
  );
}
