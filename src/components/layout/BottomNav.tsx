import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, CandlestickChart, BarChart3, BookOpen, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  {
    to: '/app',
    label: 'nav.home',
    icon: Home,
    end: true,
  },
  {
    to: '/app/trade',
    label: 'nav.trade',
    icon: CandlestickChart,
    end: false,
  },
  {
    to: '/app/stats',
    label: 'nav.stats',
    icon: BarChart3,
    end: false,
  },
  {
    to: '/app/journal',
    label: 'nav.journal',
    icon: BookOpen,
    end: false,
  },
  {
    to: '/app/profile',
    label: 'nav.profile',
    icon: User,
    end: false,
  },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-garda-surface/95 backdrop-blur-md border-t border-garda-border safe-bottom">
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
          const isActive = end
            ? location.pathname === to
            : location.pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-lg transition-colors min-w-[60px]',
                isActive
                  ? 'text-garda-cyan'
                  : 'text-garda-text-muted hover:text-garda-text-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">
                {t(label)}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
