import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Shield, Users, Activity, Settings, ArrowLeft, LogOut } from 'lucide-react';
import { clearAdminToken } from '@/pages/admin/AdminLogin';

const ADMIN_NAV = [
  { to: '/admin', icon: Shield, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/logs', icon: Activity, label: 'Logs' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-garda-bg text-garda-text">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 h-screen sticky top-0 bg-garda-card border-r border-garda-border p-4 hidden md:flex md:flex-col">
          <NavLink to="/admin" className="flex items-center gap-2 mb-6">
            <Shield className="w-5 h-5 text-garda-cyan" />
            <span className="font-bold text-sm">Admin Panel</span>
          </NavLink>
          <nav className="space-y-1 flex-1">
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
                className={({ isActive }) => cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive ? 'bg-garda-cyan/10 text-garda-cyan' : 'text-garda-text-secondary hover:bg-garda-surface',
                )}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-1 pt-4 border-t border-garda-border">
            <button onClick={handleLogout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-garda-pink hover:bg-garda-pink/5 transition-colors">
              <LogOut className="w-3.5 h-3.5" />Logout
            </button>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="flex md:hidden fixed bottom-0 left-0 right-0 bg-garda-card border-t border-garda-border z-40">
          {ADMIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/admin'}
              className={({ isActive }) => cn(
                'flex-1 flex flex-col items-center py-2 text-[10px] font-medium transition-colors',
                isActive ? 'text-garda-cyan' : 'text-garda-text-muted',
              )}>
              <item.icon className="w-4 h-4 mb-0.5" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* Content */}
        <main className="flex-1 min-h-screen p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
