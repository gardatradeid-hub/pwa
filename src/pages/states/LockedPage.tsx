import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { useTimer } from '@/hooks/useTimer';
import { formatR, formatCountdown, formatDate } from '@/lib/formatters';
import type { Trade } from '@/types/trade';
import { Lock, Clock, BookOpen, TrendingUp, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LockedPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useUserStore();
  const { isLocked, cooldownUntil, setIsLocked } = useTradeStore();
  const [lastTrades, setLastTrades] = useState<Trade[]>([]);
  const [lockCount, setLockCount] = useState(0);
  const [reason, setReason] = useState('consecutive_loss');
  const [isLoading, setIsLoading] = useState(true);

  const cooldown = useTimer(cooldownUntil);

  useEffect(() => {
    async function fetchLockData() {
      if (!profile?.id) return;
      try {
        // Get last 3 trades
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', profile.id)
          .order('opened_at', { ascending: false })
          .limit(3);
        setLastTrades(trades || []);

        // Get lock events this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { data: locks } = await supabase
          .from('lock_events')
          .select('*')
          .eq('user_id', profile.id)
          .gte('locked_at', startOfMonth.toISOString())
          .order('locked_at', { ascending: false });

        if (locks && locks.length > 0) {
          setLockCount(locks.length);
          setReason(locks[0].lock_type || 'consecutive_loss');
        }
      } catch (err) {
        console.error('Fetch lock data error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLockData();
  }, [profile?.id]);

  const lang = i18n.language as 'id' | 'en';

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Lock icon */}
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-garda-pink/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-10 h-10 text-garda-pink" />
        </div>
        <h1 className="text-2xl font-bold text-garda-pink">{t('lock.locked')}</h1>
        <p className="mt-2 text-garda-text-secondary">
          {reason === 'daily_limit' ? t('lock.daily_limit') : t('lock.consecutive_loss')}
        </p>
      </div>

      {/* Countdown */}
      {cooldownUntil && !cooldown.isExpired && (
        <div className="garda-card p-5 text-center border-garda-amber/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-garda-amber" />
            <span className="text-sm text-garda-text-secondary">{t('lock.unlock_at')}</span>
          </div>
          <p className="text-3xl font-bold font-mono-num text-garda-amber">{cooldown.formatted}</p>
          <p className="text-xs text-garda-text-muted mt-1">
            {formatDate(cooldownUntil, lang)} {new Date(cooldownUntil).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Last 3 trades */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">{t('lock.last_trades')}</h3>
        {isLoading ? (
          <p className="text-sm text-garda-text-muted">{t('common.loading')}</p>
        ) : lastTrades.length === 0 ? (
          <p className="text-sm text-garda-text-muted">Belum ada trade</p>
        ) : (
          <div className="space-y-2">
            {lastTrades.map((trade) => (
              <div key={trade.id} className="flex items-center justify-between py-2 border-b border-garda-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{trade.symbol} · {trade.side.toUpperCase()}</p>
                  <p className="text-xs text-garda-text-muted">{formatDate(trade.opened_at, lang)}</p>
                </div>
                <span className={cn('text-sm font-mono-num font-medium',
                  (trade.pnl_r || 0) > 0 ? 'text-garda-cyan' : 'text-garda-pink'
                )}>
                  {formatR(trade.pnl_r)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lock count */}
      <div className="garda-card p-4 text-center">
        <p className="text-sm text-garda-text-secondary">{t('lock.lock_this_month')}</p>
        <p className="text-2xl font-bold font-mono-num text-garda-amber">{lockCount}</p>
      </div>

      {/* Tips */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-3">{t('lock.tips_title')}</h3>
        <ul className="space-y-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="flex items-start gap-3 text-sm text-garda-text-secondary">
              <span className="w-5 h-5 rounded-full bg-garda-cyan/10 text-garda-cyan flex items-center justify-center text-xs shrink-0 mt-0.5">{n}</span>
              {t(`lock.tip_${n}` as any)}
            </li>
          ))}
        </ul>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Link to="/app/journal" className="garda-btn-secondary w-full flex items-center justify-center gap-2">
          <BookOpen className="w-4 h-4" /> {t('lock.review_journal')}
        </Link>
        <Link to="/app/stats" className="garda-btn-secondary w-full flex items-center justify-center gap-2">
          <TrendingUp className="w-4 h-4" /> {t('lock.view_stats')}
        </Link>
        <button disabled className="garda-btn-primary w-full flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
          <Ban className="w-4 h-4" /> {t('lock.cant_trade')}
        </button>
      </div>
    </div>
  );
}
