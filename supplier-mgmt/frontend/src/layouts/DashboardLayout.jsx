import { Suspense, useMemo } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import AppLogo from '../components/AppLogo.jsx';
import Button from '../components/Button.jsx';
import PageLoader from '../components/PageLoader.jsx';
import NavIcon from '../components/NavIcon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePermission } from '../hooks/usePermission.js';
import { APP_NAME } from '../utils/constants.js';
import { navSections } from '../utils/navConfig.js';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const canUsers = usePermission('users', 'view');
  const canRoles = usePermission('roles', 'view');
  const canSettings = canUsers || canRoles;

  const sections = useMemo(
    () =>
      navSections.filter((section) => {
        if (section.settingsOnly) return canSettings;
        return true;
      }),
    [canSettings]
  );

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className="flex h-screen overflow-hidden app-shell-bg">
      <aside className="sidebar-premium fixed inset-y-0 left-0 z-40 flex w-16 flex-col lg:w-[248px]">
        <Link
          to="/dashboard"
          className="flex h-[60px] shrink-0 items-center justify-center border-b border-white/10 transition hover:bg-white/5 lg:justify-start lg:px-5"
        >
          <AppLogo size="md" ringClassName="ring-amber-400/60" />
          <div className="ml-3 hidden min-w-0 lg:block">
            <p className="truncate text-sm font-bold tracking-tight text-white">{APP_NAME}</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-widest text-amber-400/90">
              Fleet & Billing
            </p>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {sections.map((section) => (
            <div key={section.label ?? 'home'} className="mb-5">
              {section.label && (
                <p className="sidebar-section-label mb-2 hidden px-3 text-[10px] font-bold uppercase tracking-[0.14em] lg:block">
                  {section.label}
                </p>
              )}
              {section.label && (
                <div className="my-2 border-t border-white/10 lg:hidden" />
              )}
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={item.label}
                        className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200 lg:px-3 ${
                          isActive
                            ? 'sidebar-nav-active'
                            : 'sidebar-nav-link'
                        } justify-center px-2 lg:justify-start`
                      }
                    >
                      <NavIcon name={item.icon} className="h-5 w-5 shrink-0 opacity-90" />
                      <span className="hidden truncate lg:inline">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-white/10 p-4 lg:block">
          <p className="sidebar-section-label text-[10px] font-medium uppercase tracking-wider">Operations</p>
          <p className="mt-1 text-xs text-slate-300">Earth movers management</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-16 lg:pl-[248px]">
        <header className="glass-header sticky top-0 z-30 flex h-[60px] shrink-0 items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <AppLogo size="sm" className="lg:hidden" ringClassName="ring-cyan-500/40" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-100 lg:text-lg">{APP_NAME}</h1>
              <p className="hidden text-xs text-slate-400 sm:block">Operations dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            {user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                  <p className="text-xs font-medium text-amber-400/90">{user.roleName}</p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-900/80 to-slate-900 text-xs font-bold text-white shadow-md ring-2 ring-cyan-500/25"
                  title={user.name}
                >
                  {initials}
                </div>
              </div>
            )}
            <Button
              variant="secondary"
              onClick={logout}
              className="btn-header-ghost !py-2 !text-xs sm:!text-sm"
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="app-main-canvas flex-1 overflow-y-auto p-4 lg:p-8">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
