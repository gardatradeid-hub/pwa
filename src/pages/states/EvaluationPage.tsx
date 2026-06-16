import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { formatUSDT } from '@/lib/formatters';
import { AlertTriangle, TrendingDown, CheckCircle2, ArrowRight } from 'lucide-react';

export default function EvaluationPage() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [peak, setPeak] = useState(0);
  const [current, setCurrent] = useState(0);
  const [drawdown, setDrawdown] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      try {
        // Get latest equity snapshot
        const { data: snapshots } = await supabase
          .from('equity_snapshots')
          .select('*')
          .eq('user_id', profile.id)
          .order('snapshot_at', { ascending: false })
          .limit(1);

        if (snapshots && snapshots.length > 0) {
          setPeak(snapshots[0].high_water_mark);
          setCurrent(snapshots[0].balance_usdt);
          setDrawdown(snapshots[0].drawdown_r || 0);
        }
      } catch (err) {
        console.error('Fetch evaluation data error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [profile?.id]);

  const checklist = [
    t('evaluation.check_1'),
    t('evaluation.check_2'),
    t('evaluation.check_3'),
    t('evaluation.check_4'),
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Warning header */}
      <div className="text-center py-8">
        <div className="w-20 h-20 rounded-full bg-garda-amber/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-10 h-10 text-garda-amber" />
        </div>
        <h1 className="text-2xl font-bold text-garda-amber">{t('evaluation.title')}</h1>
        <p className="mt-2 text-garda-text-secondary">{t('evaluation.subtitle')}</p>
      </div>

      {/* Balance display */}
      <div className="garda-card p-5 space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-garda-text-secondary">{t('evaluation.peak')}</span>
          <span className="font-mono-num font-medium text-garda-cyan">{formatUSDT(peak)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-garda-text-secondary">{t('evaluation.current')}</span>
          <span className="font-mono-num font-medium">{formatUSDT(current)}</span>
        </div>
        <div className="h-px bg-garda-border" />
        <div className="flex justify-between">
          <span className="text-sm text-garda-text-secondary">{t('evaluation.drawdown')}</span>
          <span className="font-mono-num font-bold text-garda-pink">{drawdown.toFixed(1)}R</span>
        </div>
      </div>

      {/* Cannot trade warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-garda-pink/10 border border-garda-pink/20">
        <TrendingDown className="w-5 h-5 text-garda-pink mt-0.5 shrink-0" />
        <p className="text-sm text-garda-pink">{t('evaluation.cant_trade')}</p>
      </div>

      {/* Checklist */}
      <div className="garda-card p-5">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">
          {t('evaluation.checklist')}
        </h3>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-garda-text-muted mt-0.5 shrink-0" />
              <span className="text-sm text-garda-text-secondary">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Start Review */}
      <button className="garda-btn-primary w-full flex items-center justify-center gap-2">
        {t('evaluation.start_review')} <ArrowRight className="w-4 h-4" />
      </button>

      {/* After review note */}
      <p className="text-xs text-garda-text-muted text-center px-4">
        {t('evaluation.after_review')}
      </p>
    </div>
  );
}
