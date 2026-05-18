export default function StatCard({ label, value, subtext, accent = 'slate' }) {
  const accents = {
    slate: 'border-slate-200',
    blue: 'border-blue-200 bg-blue-50/50',
    green: 'border-green-200 bg-green-50/50',
    amber: 'border-amber-200 bg-amber-50/50',
    red: 'border-red-200 bg-red-50/50',
  };

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accents[accent] || accents.slate}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
    </div>
  );
}
