import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { formatR, formatUSDT, formatDate } from '@/lib/formatters';
import type { Trade } from '@/types/trade';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function JournalDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { profile } = useUserStore();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTrade() {
      if (!id || !profile?.id) return;
      try {
        const { data } = await supabase
          .from('trades')
          .select('*')
          .eq('id', id)
          .eq('user_id', profile.id)
          .single();
        setTrade(data as Trade);
      } catch (err) {
        console.error('Fetch trade error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTrade();
  }, [id, profile?.id]);

  if (isLoading) {
    return <div className="px-4 py-8 text-center text-garda-text-muted">{t('common.loading')}</div>;
  }

  if (!trade) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-garda-text-muted">Trade tidak ditemukan</p>
        <Link to="/app/journal" className="text-sm text-garda-cyan mt-2 inline-block">← {t('common.back')}</Link>
      </div>
    );
  }

  const lang = i18n.language as 'id' | 'en';
  const isWin = trade.pnl_r && trade.pnl_r > 0;

  return (
    <div className="px-4 py-6 space-y-6">
      <Link to="/app/journal" className="inline-flex items-center gap-1 text-sm text-garda-text-secondary">
        <ArrowLeft className="w-4 h-4" /> {t('common.back')}
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{trade.symbol}</h1>
          <p className="text-sm text-garda-text-secondary">{trade.side.toUpperCase()}</p>
        </div>
        <div className={cn(
          'px-4 py-2 rounded-lg font-mono-num font-bold text-lg',
          isWin ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-pink/10 text-garda-pink'
        )}>
          {formatR(trade.pnl_r)}
        </div>
      </div>

      {/* Price details */}
      <div className="garda-card p-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-garda-text-secondary text-sm">{t('active_trade.entry')}</span>
          <span className="font-mono-num font-medium">{formatUSDT(trade.entry_price)}</span>
        </div>
        {trade.exit_price && (
          <div className="flex justify-between">
            <span className="text-garda-text-secondary text-sm">Exit</span>
            <span className="font-mono-num font-medium">{formatUSDT(trade.exit_price)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-garda-text-secondary text-sm">Stop Loss</span>
          <span className="font-mono-num font-medium text-garda-pink">{formatUSDT(trade.stop_loss)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-garda-text-secondary text-sm">Take Profit</span>
          <span className="font-mono-num font-medium text-garda-cyan">{formatUSDT(trade.take_profit)}</span>
        </div>
        <div className="h-px bg-garda-border" />
        <div className="flex justify-between">
          <span className="text-garda-text-secondary text-sm">{t('trade.qty')}</span>
          <span className="font-mono-num">{trade.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-garda-text-secondary text-sm">{t('trade.rr_ratio')}</span>
          <span className="font-mono-num">1:{trade.rr_ratio}</span>
        </div>
        {trade.pnl_usdt != null && (
          <div className="flex justify-between">
            <span className="text-garda-text-secondary text-sm">P&L USDT</span>
            <span className="font-mono-num font-medium">{formatUSDT(trade.pnl_usdt)}</span>
          </div>
        )}
      </div>

      {/* Emotions */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          {t('journal.emotion_entry')} & {t('journal.emotion_exit')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-garda-text-muted mb-1">{t('journal.emotion_entry')}</p>
            <span className="inline-block px-3 py-1 rounded-full bg-garda-surface text-sm">
              {trade.emotion_entry ? t(`emotions.${trade.emotion_entry}`) : '—'}
            </span>
          </div>
          <div>
            <p className="text-xs text-garda-text-muted mb-1">{t('journal.emotion_exit')}</p>
            <span className="inline-block px-3 py-1 rounded-full bg-garda-surface text-sm">
              {trade.emotion_exit ? t(`emotions.${trade.emotion_exit}`) : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-2">{t('journal.notes')}</h3>
        <p className="text-sm text-garda-text-secondary leading-relaxed">
          {trade.notes || '—'}
        </p>
      </div>
    </div>
  );
}
