import { useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import Button from '../components/Button.jsx';
import NavIcon from '../components/NavIcon.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { usePermission } from '../hooks/usePermission.js';
import { APP_INITIALS, APP_NAME } from '../utils/constants.js';
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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-16 flex-col bg-slate-900 lg:w-[240px]">
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-slate-700/80 lg:justify-start lg:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white">
            {APP_INITIALS}
          </div>
          <span className="ml-3 hidden truncate text-sm font-semibold text-white lg:block">
            {APP_NAME}
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          {sections.map((section) => (
            <div key={section.label ?? 'home'} className="mb-4">
              {section.label && (
                <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 lg:block">
                  {section.label}
                </p>
              )}
              {section.label && (
                <div className="my-2 border-t border-slate-700/50 lg:hidden" />
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      title={item.label}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition lg:px-3 ${
                          isActive
                            ? 'bg-white/15 text-white'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        } justify-center px-2 lg:justify-start`
                      }
                    >
                      <NavIcon name={item.icon} className="h-5 w-5 shrink-0" />
                      <span className="hidden truncate lg:inline">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-16 lg:pl-[240px]">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white lg:hidden">
              {APP_INITIALS}
            </div>
            <h1 className="text-base font-semibold text-slate-900 lg:text-lg">{APP_NAME}</h1>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">{user.name}</p>
                <p className="text-xs text-slate-500">{user.roleName}</p>
              </div>
            )}
            <Button variant="secondary" onClick={logout}>
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
