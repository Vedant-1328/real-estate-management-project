import { useLocation } from 'react-router-dom';

export default function ModulePlaceholder({ title }) {
  const location = useLocation();

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-slate-600">This module is coming soon.</p>
      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Route: <code className="rounded bg-slate-100 px-2 py-0.5">{location.pathname}</code>
      </div>
    </div>
  );
}
