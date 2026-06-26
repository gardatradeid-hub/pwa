import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Shield, Users, Activity, Settings, LogOut, ChevronLeft } from 'lucide-react';
import { clearAdminToken } from '@/pages/admin/AdminLogin';

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const nav = [
    { to: '/admin',        icon: Shield,   label: t('admin.nav_dashboard') },
    { to: '/admin/users',  icon: Users,    label: t('admin.nav_users') },
    { to: '/admin/logs',   icon: Activity, label: t('admin.nav_logs') },
    { to: '/admin/settings', icon: Settings, label: t('admin.nav_settings') },
  ];

  return (
    <div className="min-h-screen bg-garda-bg text-garda-text">
      {/* Top bar (mobile) */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-garda-border bg-garda-card sticky top-0 z-30">
        <span className="font-bold text-sm text-garda-cyan">{t('admin.title')}</span>
        <button onClick={() => { clearAdminToken(); navigate('/admin/login', { replace: true }); }}
          className="text-xs text-garda-pink flex items-center gap-1">
          <LogOut className="w-3.5 h-3.5" />{t('admin.logout')}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="w-56 h-screen sticky top-0 bg-garda-card border-r border-garda-border hidden md:flex md:flex-col">
          <div className="px-5 py-5">
            <NavLink to="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-garda-cyan/10 flex items-center justify-center">
                <Shield className="w-4 h-4 text-garda-cyan" />
              </div>
              <span className="font-bold text-sm text-garda-cyan">{t('admin.title')}</span>
            </NavLink>
          </div>

          <nav className="px-3 space-y-0.5 flex-1">
            {nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-garda-cyan/10 text-garda-cyan'
                    : 'text-garda-text-secondary hover:bg-garda-surface hover:text-garda-text',
                )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="px-3 pb-5 pt-3 border-t border-garda-border">
            <button onClick={() => { clearAdminToken(); navigate('/admin/login', { replace: true }); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-garda-pink hover:bg-garda-pink/5 transition-colors">
              <LogOut className="w-4 h-4" />{t('admin.logout')}
            </button>
            <a href="/app" className="mt-1 w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-garda-text-muted hover:text-garda-text-secondary transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />{t('admin.back_to_app')}
            </a>
          </div>
        </aside>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-garda-card border-t border-garda-border z-40 flex">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-garda-cyan' : 'text-garda-text-muted',
              )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 min-h-screen p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
