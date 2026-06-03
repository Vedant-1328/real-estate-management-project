import { Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo.jsx';
import { APP_NAME, APP_TAGLINE } from '../utils/constants.js';

export default function AuthLayout() {
  return (
    <div className="auth-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="auth-shell__base" aria-hidden />
      <div className="auth-shell__glow auth-shell__glow--cyan" aria-hidden />
      <div className="auth-shell__glow auth-shell__glow--amber" aria-hidden />
      <div className="auth-shell__grid" aria-hidden />

      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-8 text-center">
          <AppLogo size="lg" className="mx-auto mb-4" ringClassName="ring-cyan-400/50" />
          <p className="auth-shell__eyebrow">Fleet & Billing</p>
          <h1 className="auth-shell__title">{APP_NAME}</h1>
          <p className="mt-2 text-sm text-slate-400">{APP_TAGLINE}</p>
        </div>
        <div className="auth-card">
          <div className="auth-card__accent" aria-hidden />
          <div className="auth-card__inner">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
