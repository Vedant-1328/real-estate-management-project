import { memo } from 'react';

const ACCENTS = {
  slate: {
    ring: 'ring-slate-200/80',
    iconBg: 'bg-slate-100',
    iconText: 'text-slate-600',
    glow: 'from-slate-400/5',
    premium: 'stat-card-premium--slate',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    ),
  },
  blue: {
    ring: 'ring-blue-200/70',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    glow: 'from-blue-400/10',
    premium: 'stat-card-premium--blue',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
  },
  green: {
    ring: 'ring-emerald-200/70',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    glow: 'from-emerald-400/10',
    premium: 'stat-card-premium--green',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  amber: {
    ring: 'ring-amber-200/70',
    iconBg: 'bg-amber-50',
    iconText: 'text-amber-600',
    glow: 'from-amber-400/12',
    premium: 'stat-card-premium--amber',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
  red: {
    ring: 'ring-rose-200/70',
    iconBg: 'bg-rose-50',
    iconText: 'text-rose-600',
    glow: 'from-rose-400/10',
    premium: 'stat-card-premium--red',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
  },
};

function StatCard({
  label,
  value,
  subtext,
  accent = 'slate',
  variant = 'default',
  animDelay = 0,
  animate = false,
}) {
  const style = ACCENTS[accent] || ACCENTS.slate;
  const isPremium = variant === '3d';

  if (isPremium) {
    return (
      <div
        className={`stat-card-premium stat-card-3d ${style.premium}${animate ? ' dashboard-detail-item' : ''}`}
        style={animate ? { animationDelay: `${animDelay}ms` } : undefined}
      >
        <div className="stat-card-premium__border" aria-hidden />
        <div className="stat-card-premium__shine" aria-hidden />
        <div className="stat-card-premium__content">
          <p className="stat-card-premium__label">{label}</p>
          <p className="stat-card-premium__value">{value}</p>
          {subtext && <p className="stat-card-premium__sub">{subtext}</p>}
        </div>
        <div className="stat-card-premium__icon">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {style.icon}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/80 bg-white p-4 ring-1 ${style.ring} card-premium`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${style.glow} to-transparent opacity-80`}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {label}
          </p>
          <p className="mt-2 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
          {subtext && <p className="mt-1 text-xs text-slate-500">{subtext}</p>}
        </div>
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconBg} ${style.iconText} shadow-sm transition group-hover:scale-105`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {style.icon}
          </svg>
        </div>
      </div>
    </div>
  );
}

export default memo(StatCard);
