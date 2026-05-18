const variants = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-green-100 text-green-800',
  info: 'bg-blue-100 text-blue-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
};

export default function Badge({ children, variant = 'default' }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant] || variants.default}`}
    >
      {children}
    </span>
  );
}
