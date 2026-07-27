import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import { useAuthContext } from '@/components/AuthProvider';
import { useUserStore } from '@/store/useUserStore';
import { useAppStore } from '@/store/useAppStore';
import { usePhase } from '@/hooks/usePhase';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { User, Globe, Moon, Sun, LogOut, Shield, Bell, TrendingUp } from 'lucide-react';

const TIER_BG: Record<number, string> = { 1: 'bg-amber-500/10 border-amber-500/30 text-amber-400', 2: 'bg-slate-400/10 border-slate-400/30 text-slate-300', 3: 'bg-yellow-500/10 border-yellow-400/40 text-yellow-400', 4: 'bg-zinc-200/10 border-zinc-400/30 text-zinc-100' };

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleTheme } = useTheme();
  const { signOut } = useAuthContext();
  const { profile } = useUserStore();
  const { lang, setLang } = useAppStore();
  const { currentTier, nextTier, progress } = usePhase();

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

      {/* Evaluation Tier */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          <TrendingUp className="w-4 h-4 inline mr-1" /> {t('profile.current_tier')}
        </h3>

        {/* Tier badge + rules summary */}
        <div className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border', TIER_BG[currentTier?.tier] ?? TIER_BG[1])}>
          <div className="w-10 h-10 rounded-full bg-current/10 flex items-center justify-center text-lg font-bold">
            {currentTier?.tier ?? 1}
          </div>
          <div>
            <p className="font-bold text-base">{currentTier?.name ?? 'Bronze'}</p>
            <p className="text-xs opacity-80">{currentTier?.max_trades ?? 3} trade/hari · Cooldown {currentTier?.cooldown_min ?? 120}min · Min RR 1:{currentTier?.min_rr ?? 2}</p>
          </div>
        </div>

        {/* Promotion progress (next tier) */}
        {nextTier && progress.requiredTrades > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-garda-text-muted">
              Progress ke <span className="font-semibold">{nextTier.name}</span>
            </p>
            <ProgressRow label="Win Rate" current={progress.winRate} required={progress.requiredWinRate} suffix="%" />
            <ProgressRow label="Trades" current={progress.totalTrades} required={progress.requiredTrades} suffix="" />
            {progress.requiredProfitFactor != null && (
              <ProgressRow label="Profit Factor" current={progress.profitFactor} required={progress.requiredProfitFactor} suffix="" />
            )}
            {progress.requiredMaxDrawdown != null && (
              <ProgressRow label="Max Drawdown" current={progress.maxDrawdownR} required={progress.requiredMaxDrawdown} suffix="R" invert />
            )}
            {progress.ready && (
              <p className="text-xs text-garda-cyan font-semibold">🎉 Siap naik ke {nextTier.name}! Server akan auto-promote setelah trade berikutnya ditutup.</p>
            )}
          </div>
        )}

        {/* Metrics grid (lifetime) */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <MetricBox label="Total Trades" value={progress.totalTrades} />
          <MetricBox label="Win Rate" value={`${progress.winRate.toFixed(0)}%`} />
          <MetricBox label="Profit Factor" value={progress.profitFactor.toFixed(2)} />
          <MetricBox label="Max DD" value={`${progress.maxDrawdownR.toFixed(1)}R`} />
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
      <button onClick={() => signOut()}
        className="w-full garda-btn-secondary flex items-center justify-center gap-2 text-garda-pink hover:bg-garda-pink/5">
        <LogOut className="w-4 h-4" /> {t('profile.logout')}
      </button>
    </div>
  );
}

function ProgressRow({ label, current, required, suffix, invert }: { label: string; current: number; required: number; suffix: string; invert?: boolean }) {
  const pct = required > 0 ? Math.min(100, Math.max(0, (current / required) * 100)) : 0;
  const met = invert ? current <= required : current >= required;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-garda-text-muted">{label}</span>
        <span className={cn('font-mono-num', met ? 'text-garda-cyan' : 'text-garda-text-secondary')}>
          {current.toFixed(suffix === '%' ? 0 : 2)}{suffix} / {required}{suffix}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-garda-surface">
        <div className={cn('h-full rounded-full transition-all', met ? 'bg-garda-cyan' : 'bg-garda-text-muted')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="garda-card p-3 space-y-0.5">
      <p className="text-[10px] text-garda-text-muted">{label}</p>
      <p className="text-base font-bold font-mono-num">{value}</p>
    </div>
  );
}
