import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/useUserStore';
import { useAppStore } from '@/store/useAppStore';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { User, Globe, Moon, Sun, LogOut, Shield, Bell } from 'lucide-react';

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const { profile } = useUserStore();
  const { lang, setLang } = useAppStore();
  const phase = useUserStore.getState().getCurrentPhase();

  const switchLang = (l: 'id' | 'en') => {
    setLang(l);
    localStorage.setItem('garda-lang', l);
    i18n.changeLanguage(l);
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('profile.title')}</h1>

      {/* User info */}
      <div className="garda-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-garda-cyan/10 flex items-center justify-center">
          <User className="w-7 h-7 text-garda-cyan" />
        </div>
        <div>
          <p className="font-semibold text-lg">{profile?.full_name || 'Trader'}</p>
          <p className="text-sm text-garda-text-secondary">{profile?.email}</p>
          <p className="text-xs text-garda-text-muted mt-1">
            {t('profile.member_since')} {formatDate(profile?.created_at, lang)}
          </p>
        </div>
      </div>

      {/* Exchange */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          <Shield className="w-4 h-4 inline mr-1" /> {t('profile.connected_exchange')}
        </h3>
        {profile?.exchange ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <span className="font-medium capitalize">{profile.exchange}</span>
            </div>
            <span className="text-xs text-garda-cyan font-medium">{t('profile.connected')}</span>
          </div>
        ) : (
          <p className="text-sm text-garda-text-muted">Belum terhubung</p>
        )}
      </div>

      {/* Phase */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          {t('profile.current_phase')}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-garda-cyan">{phase.label}</p>
            <p className="text-xs text-garda-text-muted">Phase {phase.phase}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono-num">{phase.max_trades} trade/hari</p>
            <p className="text-xs text-garda-text-muted">Min RR 1:{phase.min_rr}</p>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="garda-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-garda-text-muted" />
          <h3 className="text-sm font-medium text-garda-text-secondary">{t('profile.language')}</h3>
        </div>
        <div className="flex gap-2">
          {(['id', 'en'] as const).map((l) => (
            <button key={l} onClick={() => switchLang(l)}
              className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                lang === l ? 'bg-garda-cyan text-[#0A0A14] border-garda-cyan' : 'border-garda-border text-garda-text-secondary hover:border-garda-border-hover'
              )}>
              {l === 'id' ? 'Bahasa Indonesia' : 'English'}
            </button>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">{t('profile.theme')}</h3>
        <div className="flex gap-2">
          <button onClick={() => isDark && toggleTheme()}
            className={cn('flex-1 py-3 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
              !isDark ? 'bg-garda-cyan text-[#0A0A14] border-garda-cyan' : 'border-garda-border text-garda-text-secondary'
            )}>
            <Sun className="w-4 h-4" /> {t('profile.light')}
          </button>
          <button onClick={() => !isDark && toggleTheme()}
            className={cn('flex-1 py-3 rounded-lg text-sm font-medium border transition-colors flex items-center justify-center gap-2',
              isDark ? 'bg-garda-cyan text-[#0A0A14] border-garda-cyan' : 'border-garda-border text-garda-text-secondary'
            )}>
            <Moon className="w-4 h-4" /> {t('profile.dark')}
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="garda-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-garda-text-muted" />
          <h3 className="text-sm font-medium text-garda-text-secondary">{t('profile.notifications')}</h3>
        </div>
        <div className="space-y-3">
          {['lock_alerts', 'cooldown_reminders', 'daily_summary'].map((key) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-sm text-garda-text-secondary">{t(`profile.${key}`)}</span>
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-6 bg-garda-border rounded-full peer-checked:bg-garda-cyan transition-colors" />
            </label>
          ))}
        </div>
      </div>

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full garda-btn-secondary flex items-center justify-center gap-2 text-garda-pink hover:bg-garda-pink/5">
        <LogOut className="w-4 h-4" /> {t('profile.logout')}
      </button>
    </div>
  );
}
