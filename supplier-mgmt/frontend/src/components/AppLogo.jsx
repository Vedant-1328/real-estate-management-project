import { useState } from 'react';
import { APP_INITIALS, APP_LOGO_SRC } from '../utils/constants.js';

const SIZES = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
};

/**
 * Circular brand logo (Sai Baba). Falls back to initials if the image fails to load.
 */
export default function AppLogo({ size = 'md', className = '', ringClassName = 'ring-amber-400/50' }) {
  const [failed, setFailed] = useState(false);
  const dim = SIZES[size] || SIZES.md;

  if (failed) {
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-extrabold text-slate-900 shadow-lg shadow-amber-500/25 ring-2 ${ringClassName} ${className}`}
        aria-hidden
      >
        {APP_INITIALS}
      </div>
    );
  }

  return (
    <div
      className={`${dim} shrink-0 overflow-hidden rounded-full bg-white shadow-lg shadow-black/20 ring-2 ${ringClassName} ${className}`}
    >
      <img
        src={APP_LOGO_SRC}
        alt={`${APP_INITIALS} logo`}
        className="h-full w-full object-cover object-center"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
