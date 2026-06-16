import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { useTimer } from '@/hooks/useTimer';
import { formatUSDT, formatR, formatCountdown, formatNumber } from '@/lib/formatters';
import {
  Wallet, TrendingUp, Activity, Target, Shield, Coins,
  Clock, Lock, ArrowRight, AlertCircle, Plus, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, balance, setBalance } = useUserStore();
  const {
    tradesToday, maxTradesToday, activeTrade,
    isLocked, cooldownUntil, setTradesToday,
  } = useTradeStore();

  const [dailyPnl, setDailyPnl] = useState(0);
  const [dailyLossR, setDailyLossR] = useState(0);
  const [winRate, setWinRate] = useState(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const phase = useUserStore.getState().getCurrentPhase();
  const cooldown = useTimer(cooldownUntil);

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Get today's stats
        const today = new Date().toISOString().split('T')[0];
        const { data: stats } = await supabase
          .from('daily_stats')
          .select('*')
          .eq('user_id', profile?.id)
          .eq('date', today)
          .single();

        if (stats) {
          setDailyPnl(stats.pnl_r || 0);
          setDailyLossR(stats.daily_loss_r || 0);
          setConsecutiveLosses(stats.consecutive_losses || 0);
          setTradesToday(stats.trades_count || 0, phase.max_trades);
        } else {
          setTradesToday(0, phase.max_trades);
        }

        // Get overall win rate
        const { count: totalTrades } = await supabase
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile?.id)
          .eq('status', 'closed');

        const { count: wins } = await supabase
          .from('trades')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', profile?.id)
          .eq('status', 'closed')
          .gt('pnl_r', 0);

        if (totalTrades && totalTrades > 0) {
          setWinRate(Math.round((wins || 0) / totalTrades * 100));
        }

        // Get balance via ccxt-proxy
        const { data: balanceData } = await supabase.functions.invoke('ccxt-proxy', {
          body: { action: 'balance' },
        });
        if (balanceData?.total_usdt) {
          setBalance(balanceData.total_usdt);
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (profile?.id) {
      fetchDashboard();
    }
  }, [profile?.id]);

  // Redirect if locked
  useEffect(() => {
    if (isLocked) {
      navigate('/app/locked');
    }
  }, [isLocked]);

  const tradeSlots = Array.from({ length: maxTradesToday }, (_, i) => i < tradesToday);

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.home')}</h1>
          <p className="text-sm text-garda-text-secondary mt-1">
            {profile?.full_name || 'Trader'} • {phase.label}
          </p>
        </div>
        {cooldownUntil && !cooldown.isExpired && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-garda-amber/10 border border-garda-amber/20">
            <Clock className="w-4 h-4 text-garda-amber" />
            <span className="text-sm font-mono-num text-garda-amber">{cooldown.formatted}</span>
          </div>
        )}
      </div>

      {/* Balance Card */}
      <div className="garda-card p-5 bg-gradient-to-br from-garda-surface to-garda-card border-garda-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-garda-text-secondary text-sm">
            <Wallet className="w-4 h-4" />
            {t('dashboard.balance')}
          </div>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-garda-cyan/10 text-garda-cyan">
            Phase {phase.phase}
          </span>
        </div>
        <p className="text-3xl font-bold font-mono-num">
          {isLoading ? '...' : formatUSDT(balance)}
        </p>
      </div>

      {/* Metric Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* P&L Today */}
        <div className="garda-card p-4">
          <div className="flex items-center gap-2 text-garda-text-muted text-xs mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            {t('dashboard.pnl_today')}
          </div>
          <p className={cn('text-xl font-bold font-mono-num', dailyPnl >= 0 ? 'text-garda-cyan' : 'text-garda-pink')}>
            {formatR(dailyPnl)}
          </p>
        </div>

        {/* Win Rate */}
        <div className="garda-card p-4">
          <div className="flex items-center gap-2 text-garda-text-muted text-xs mb-2">
            <Target className="w-3.5 h-3.5" />
            {t('dashboard.win_rate')}
          </div>
          <p className="text-xl font-bold font-mono-num">{winRate}%</p>
        </div>

        {/* Daily Loss */}
        <div className="garda-card p-4">
          <div className="flex items-center gap-2 text-garda-text-muted text-xs mb-2">
            <Shield className="w-3.5 h-3.5" />
            {t('dashboard.daily_loss')}
          </div>
          <p className={cn('text-xl font-bold font-mono-num', dailyLossR >= 3 ? 'text-garda-pink' : 'text-garda-amber')}>
            {formatR(dailyLossR)} / 3R
          </p>
        </div>

        {/* Consecutive Losses */}
        <div className="garda-card p-4">
          <div className="flex items-center gap-2 text-garda-text-muted text-xs mb-2">
            <Activity className="w-3.5 h-3.5" />
            {t('lock.consecutive_loss')}
          </div>
          <p className={cn('text-xl font-bold font-mono-num', consecutiveLosses >= 3 ? 'text-garda-pink' : 'text-garda-text')}>
            {consecutiveLosses}
          </p>
        </div>
      </div>

      {/* Daily Activity */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          {t('dashboard.daily_activity')}
        </h3>
        <div className="flex items-center gap-3">
          {tradeSlots.map((used, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-3 rounded-full transition-all',
                used ? 'bg-garda-cyan' : 'bg-garda-border'
              )}
            />
          ))}
        </div>
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-garda-text-muted">
            {t('dashboard.trades_usage', { used: tradesToday, max: maxTradesToday })}
          </p>
          {tradesToday < maxTradesToday && !isLocked && !activeTrade && !cooldownUntil && (
            <Link to="/app/trade" className="text-xs text-garda-cyan font-medium flex items-center gap-1">
              <Plus className="w-3 h-3" /> {t('dashboard.open_trade')}
            </Link>
          )}
        </div>
      </div>

      {/* Lock Warning */}
      {isLocked && (
        <div className="garda-card p-5 border-garda-pink/30 bg-garda-pink/5">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-garda-pink shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-garda-pink">{t('lock.locked')}</h3>
              <p className="text-sm text-garda-text-secondary mt-1">{t('lock.cant_trade')}</p>
              <Link to="/app/locked" className="inline-flex items-center gap-1 text-sm text-garda-cyan mt-3">
                {t('lock.review_journal')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Active Trade Card */}
      {activeTrade && (
        <div className="garda-card p-5 border-garda-cyan/30">
          <h3 className="text-sm font-medium text-garda-text-secondary mb-3">
            {t('active_trade.title')}
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold font-mono-num">{activeTrade.symbol}</p>
              <p className="text-xs text-garda-text-muted">{activeTrade.side.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono-num text-garda-text-secondary">
                Entry {formatUSDT(activeTrade.entry_price)}
              </p>
              <Link to="/app/trade" className="text-xs text-garda-cyan font-medium">
                {t('active_trade.modify_tp_sl')} →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to="/app/journal" className="garda-card p-4 hover:border-garda-border-hover transition-colors">
          <FileText className="w-5 h-5 text-garda-text-secondary mb-2" />
          <p className="text-sm font-medium">{t('journal.title')}</p>
          <p className="text-xs text-garda-text-muted mt-1">{t('lock.tip_1')}</p>
        </Link>
        <Link to="/app/stats" className="garda-card p-4 hover:border-garda-border-hover transition-colors">
          <TrendingUp className="w-5 h-5 text-garda-text-secondary mb-2" />
          <p className="text-sm font-medium">{t('stats.title')}</p>
          <p className="text-xs text-garda-text-muted mt-1">{t('stats.phase_progress')}</p>
        </Link>
      </div>
    </div>
  );
}
