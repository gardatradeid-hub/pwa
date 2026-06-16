import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { DEFAULT_TRADING_RULES, DEFAULT_PHASE_CONFIG } from '@/config/constants';
import { Shield, Check, AlertTriangle } from 'lucide-react';

export default function AcceptRules() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = [
    { label: 'Leverage', value: `${DEFAULT_TRADING_RULES.leverage}x`, desc: 'Terkunci' },
    { label: 'Risk per trade', value: `${DEFAULT_TRADING_RULES.risk_per_trade_pct}%`, desc: '1R' },
    { label: 'Max posisi', value: DEFAULT_TRADING_RULES.max_positions, desc: 'Terkunci' },
    { label: 'Max trade/hari', value: DEFAULT_TRADING_RULES.max_trades_per_day, desc: 'Phase 1' },
    { label: 'Daily loss limit', value: `${DEFAULT_TRADING_RULES.daily_loss_limit_r}R`, desc: 'Auto-lock' },
    { label: 'Total drawdown', value: `${DEFAULT_TRADING_RULES.total_drawdown_r}R`, desc: 'Evaluasi' },
    { label: 'Min RR', value: `1:${DEFAULT_PHASE_CONFIG.phases[0].min_rr}`, desc: 'Phase 1' },
    { label: 'Martingale', value: 'Diblokir', desc: 'Tidak bisa' },
    { label: 'Averaging down', value: 'Diblokir', desc: 'Tidak bisa' },
  ];

  const handleStart = async () => {
    if (!accepted) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      if (updateError) throw updateError;
      navigate('/app');
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-garda-bg px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-garda-cyan/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-garda-cyan" />
          </div>
          <h1 className="text-2xl font-bold">{t('onboarding.rules_title')}</h1>
          <p className="mt-2 text-garda-text-secondary">{t('onboarding.rules_subtitle')}</p>
        </div>

        {/* Rules list */}
        <div className="space-y-3 mb-8">
          {rules.map((rule, i) => (
            <div key={i} className="garda-card p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{rule.label}</p>
                <p className="text-xs text-garda-text-muted mt-0.5">{rule.desc}</p>
              </div>
              <span className="text-sm font-mono-num font-medium text-garda-cyan">{rule.value}</span>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-garda-amber/10 border border-garda-amber/20 mb-6">
          <AlertTriangle className="w-5 h-5 text-garda-amber mt-0.5 shrink-0" />
          <p className="text-sm text-garda-amber">
            Aturan ini tidak bisa diubah. Ini untuk melindungi Anda dari kesalahan trading yang umum.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm mb-6">
            {error}
          </div>
        )}

        {/* Accept checkbox */}
        <label className="flex items-start gap-3 p-4 rounded-xl border border-garda-border hover:border-garda-cyan/50 cursor-pointer transition-colors mb-6">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 rounded border-garda-border"
          />
          <span className="text-sm text-garda-text-secondary">{t('onboarding.accept')}</span>
        </label>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!accepted || isSubmitting}
          className="garda-btn-primary w-full flex items-center justify-center gap-2"
        >
          {isSubmitting ? t('common.loading') : t('onboarding.start')}
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
