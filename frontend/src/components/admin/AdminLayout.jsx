import React, { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  Shield,
  X,
} from 'lucide-react';
import { APP_ROUTES, STORAGE_KEYS } from '../../constants/appConstants';

const navLinkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const onLogout = () => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    navigate(APP_ROUTES.LOGIN, { replace: true });
  };

  const closeMobile = () => setMobileOpen(false);

  // Filter nav items based on user role
  // Chat menu only visible to Admin
  const navItems = [
    {
      to: '/admin/events',
      label: 'Events',
      icon: CalendarDays,
    },
    ...(user?.role === 'Admin'
      ? [
          {
            to: '/admin/chat',
            label: 'Chat',
            icon: MessageSquareText,
          },
          {
            to: '/admin/users',
            label: 'Users',
            icon: Users,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-sm">
                <Shield className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-slate-900">
                  Admin Dashboard
                </div>
                <div className="text-xs text-slate-500">
                  {user?.email || 'Signed in'}
                </div>
              </div>
            </div>
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={onLogout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 sm:px-6 md:grid-cols-[260px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-3 px-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Menu
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      [
                        navLinkBase,
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                          : 'text-slate-700 hover:bg-slate-50',
                      ].join(' ')
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-slate-900/40"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 h-full w-[86%] max-w-xs border-r border-slate-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="text-sm font-semibold text-slate-900">
                  Navigation
                </div>
                <button
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                  onClick={closeMobile}
                  aria-label="Close navigation"
                  type="button"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-3">
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={closeMobile}
                        className={({ isActive }) =>
                          [
                            navLinkBase,
                            isActive
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                              : 'text-slate-700 hover:bg-slate-50',
                          ].join(' ')
                        }
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <section className="min-w-0">
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export default AdminLayout;

