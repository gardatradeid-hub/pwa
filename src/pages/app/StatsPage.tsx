import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { formatR, formatPct } from '@/lib/formatters';
import type { Trade } from '@/types/trade';
import { TrendingUp, Target, Activity, Award, TrendingDown } from 'lucide-react';
import { EquityCurveChart } from '@/components/stats/EquityCurveChart';
import { cn } from '@/lib/utils';

export default function StatsPage() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    profitFactor: 0,
    totalPnlR: 0,
    avgWinR: 0,
    avgLossR: 0,
    bestStreak: 0,
    worstStreak: 0,
    bestEmotion: '',
    worstEmotion: '',
  });

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.id) return;
      try {
        const { data: trades } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', profile.id)
          .eq('status', 'closed');

        if (!trades || trades.length === 0) {
          setIsLoading(false);
          return;
        }

        const closed = trades as Trade[];
        const wins = closed.filter(t => (t.pnl_r || 0) > 0);
        const losses = closed.filter(t => (t.pnl_r || 0) < 0);
        const totalPnlR = closed.reduce((sum, t) => sum + (t.pnl_r || 0), 0);

        const winAmounts = wins.map(t => t.pnl_r || 0);
        const lossAmounts = losses.map(t => Math.abs(t.pnl_r || 0));

        const avgWinR = wins.length > 0 ? winAmounts.reduce((a, b) => a + b, 0) / wins.length : 0;
        const avgLossR = losses.length > 0 ? lossAmounts.reduce((a, b) => a + b, 0) / losses.length : 0;

        const totalWins = winAmounts.reduce((a, b) => a + b, 0);
        const totalLosses = lossAmounts.reduce((a, b) => a + b, 0);
        const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

        // Streaks
        let currentStreak = 0;
        let bestStreak = 0;
        let worstStreak = 0;
        for (const t of closed) {
          if ((t.pnl_r || 0) > 0) {
            currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
          } else {
            currentStreak = currentStreak < 0 ? currentStreak - 1 : -1;
          }
          bestStreak = Math.max(bestStreak, currentStreak);
          worstStreak = Math.min(worstStreak, currentStreak);
        }

        // Emotional patterns
        const emotionWins: Record<string, number> = {};
        const emotionLosses: Record<string, number> = {};
        for (const t of closed) {
          if ((t.pnl_r || 0) > 0 && t.emotion_entry) {
            emotionWins[t.emotion_entry] = (emotionWins[t.emotion_entry] || 0) + 1;
          }
          if ((t.pnl_r || 0) < 0 && t.emotion_entry) {
            emotionLosses[t.emotion_entry] = (emotionLosses[t.emotion_entry] || 0) + 1;
          }
        }

        const bestEmotion = Object.entries(emotionWins).sort((a, b) => b[1] - a[1])[0];
        const worstEmotion = Object.entries(emotionLosses).sort((a, b) => b[1] - a[1])[0];

        setStats({
          totalTrades: closed.length,
          wins: wins.length,
          losses: losses.length,
          winRate: closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0,
          profitFactor: profitFactor === Infinity ? 999 : Math.round(profitFactor * 100) / 100,
          totalPnlR: Math.round(totalPnlR * 100) / 100,
          avgWinR: Math.round(avgWinR * 100) / 100,
          avgLossR: Math.round(avgLossR * 100) / 100,
          bestStreak,
          worstStreak: Math.abs(worstStreak),
          bestEmotion: bestEmotion?.[0] || '',
          worstEmotion: worstEmotion?.[0] || '',
        });
      } catch (err) {
        console.error('Fetch stats error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [profile?.id]);

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('stats.title')}</h1>

      {isLoading ? (
        <p className="text-garda-text-muted text-center py-8">{t('common.loading')}</p>
      ) : (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="garda-card p-4">
              <Activity className="w-4 h-4 text-garda-text-muted mb-2" />
              <p className="text-xl font-bold font-mono-num">{stats.totalTrades}</p>
              <p className="text-xs text-garda-text-muted">{t('stats.total_trades')}</p>
            </div>
            <div className="garda-card p-4">
              <Target className="w-4 h-4 text-garda-text-muted mb-2" />
              <p className="text-xl font-bold font-mono-num">{stats.winRate}%</p>
              <p className="text-xs text-garda-text-muted">{t('stats.win_rate')}</p>
            </div>
            <div className="garda-card p-4">
              <TrendingUp className="w-4 h-4 text-garda-text-muted mb-2" />
              <p className="text-xl font-bold font-mono-num">{stats.profitFactor}</p>
              <p className="text-xs text-garda-text-muted">{t('stats.profit_factor')}</p>
            </div>
            <div className="garda-card p-4">
              <Award className="w-4 h-4 text-garda-text-muted mb-2" />
              <p className={cn('text-xl font-bold font-mono-num', stats.totalPnlR >= 0 ? 'text-garda-cyan' : 'text-garda-pink')}>
                {formatR(stats.totalPnlR)}
              </p>
              <p className="text-xs text-garda-text-muted">{t('stats.total_pnl')}</p>
            </div>
          </div>

          {/* Equity Curve — Recharts */}
          <EquityCurveChart />

          {/* Additional Stats */}
          <div className="garda-card p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-garda-text-secondary">{t('stats.avg_win')}</span>
              <span className="font-mono-num text-garda-cyan">+{formatR(stats.avgWinR)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-garda-text-secondary">{t('stats.avg_loss')}</span>
              <span className="font-mono-num text-garda-pink">-{formatR(stats.avgLossR)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-garda-text-secondary">{t('stats.best_streak')}</span>
              <span className="font-mono-num text-garda-cyan">{stats.bestStreak}W</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-garda-text-secondary">{t('stats.worst_streak')}</span>
              <span className="font-mono-num text-garda-pink">{stats.worstStreak}L</span>
            </div>
          </div>

          {/* Emotional Patterns */}
          <div className="garda-card p-5">
            <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
              {t('stats.emotional_patterns')}
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-garda-text-muted">{t('stats.most_wins_when')}</p>
                <p className="font-medium text-garda-cyan">
                  {stats.bestEmotion ? t(`emotions.${stats.bestEmotion}`) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-garda-text-muted">{t('stats.most_losses_when')}</p>
                <p className="font-medium text-garda-pink">
                  {stats.worstEmotion ? t(`emotions.${stats.worstEmotion}`) : '—'}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
