import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { formatR, formatUSDT, formatDate } from '@/lib/formatters';
import type { Trade } from '@/types/trade';
import { BookOpen, TrendingUp, TrendingDown, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function JournalPage() {
  const { t, i18n } = useTranslation();
  const { profile } = useUserStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filter, setFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrades() {
      if (!profile?.id) return;
      try {
        let query = supabase
          .from('trades')
          .select('*')
          .eq('user_id', profile.id)
          .order('opened_at', { ascending: false })
          .limit(50);

        if (filter === 'wins') {
          query = query.eq('status', 'closed').gt('pnl_r', 0);
        } else if (filter === 'losses') {
          query = query.eq('status', 'closed').lt('pnl_r', 0);
        }

        const { data } = await query;
        setTrades(data || []);
      } catch (err) {
        console.error('Fetch trades error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrades();
  }, [profile?.id, filter]);

  const totalTrades = trades.length;
  const wins = trades.filter(t => t.pnl_r && t.pnl_r > 0).length;
  const losses = trades.filter(t => t.pnl_r && t.pnl_r < 0).length;

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold">{t('journal.title')}</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="garda-card p-3 text-center">
          <p className="text-lg font-bold font-mono-num">{totalTrades}</p>
          <p className="text-xs text-garda-text-muted">{t('journal.total_trades')}</p>
        </div>
        <div className="garda-card p-3 text-center">
          <p className="text-lg font-bold font-mono-num text-garda-cyan">{wins}</p>
          <p className="text-xs text-garda-text-muted">{t('journal.wins')}</p>
        </div>
        <div className="garda-card p-3 text-center">
          <p className="text-lg font-bold font-mono-num text-garda-pink">{losses}</p>
          <p className="text-xs text-garda-text-muted">{t('journal.losses')}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex bg-garda-input rounded-lg p-1">
        {(['all', 'wins', 'losses'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex-1 py-2 rounded-md text-sm font-medium transition-colors',
              filter === f ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary'
            )}
          >
            {t(`journal.${f}`)}
          </button>
        ))}
      </div>

      {/* Trade list */}
      {isLoading ? (
        <p className="text-garda-text-muted text-center py-8">{t('common.loading')}</p>
      ) : trades.length === 0 ? (
        <div className="garda-card p-8 text-center">
          <BookOpen className="w-10 h-10 text-garda-text-muted mx-auto mb-3" />
          <p className="text-garda-text-muted">Belum ada trade. Mulai trading untuk melihat jurnal.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <Link
              key={trade.id}
              to={`/app/journal/${trade.id}`}
              className="garda-card p-4 flex items-center justify-between hover:border-garda-border-hover transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-8 h-8 rounded-lg flex items-center justify-center',
                  trade.pnl_r && trade.pnl_r > 0 ? 'bg-garda-cyan/10' :
                  trade.pnl_r && trade.pnl_r < 0 ? 'bg-garda-pink/10' :
                  'bg-garda-surface'
                )}>
                  {trade.pnl_r && trade.pnl_r > 0 ? (
                    <TrendingUp className="w-4 h-4 text-garda-cyan" />
                  ) : trade.pnl_r && trade.pnl_r < 0 ? (
                    <TrendingDown className="w-4 h-4 text-garda-pink" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-garda-text-muted" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{trade.symbol}</p>
                  <p className="text-xs text-garda-text-muted">
                    {trade.side.toUpperCase()} • {formatDate(trade.opened_at, i18n.language as 'id' | 'en')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className={cn('text-sm font-mono-num font-medium',
                    trade.pnl_r && trade.pnl_r > 0 ? 'text-garda-cyan' : 'text-garda-pink'
                  )}>
                    {formatR(trade.pnl_r)}
                  </p>
                  {trade.emotion_entry && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-garda-surface text-garda-text-muted">
                      {t(`emotions.${trade.emotion_entry}`)}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-garda-text-muted" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
