import { useTranslation } from 'react-i18next';
import { useTimer } from '@/hooks/useTimer';
import { useTradeStore } from '@/store/useTradeStore';
import { useUserStore } from '@/store/useUserStore';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export function CooldownCard() {
  const { t } = useTranslation();
  const { cooldownUntil } = useTradeStore();
  const phase = useUserStore.getState().getCurrentPhase();
  const timer = useTimer(cooldownUntil);

  if (!cooldownUntil || timer.isExpired) return null;

  const checklist = [
    { label: t('lock.tip_1'), done: false },
    { label: t('lock.tip_2'), done: false },
    { label: t('lock.tip_3'), done: false },
  ];

  return (
    <div className="garda-card p-5 border-garda-amber/30">
      {/* Timer */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-garda-amber/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-garda-amber" />
        </div>
        <div>
          <p className="text-sm font-medium text-garda-amber">
            {t('dashboard.cooldown_remaining', { minutes: Math.ceil(timer.totalSeconds / 60) })}
          </p>
          <p className="text-2xl font-bold font-mono-num text-garda-amber">{timer.formatted}</p>
        </div>
      </div>

      {/* Phase info */}
      <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-surface mb-4">
        <AlertTriangle className="w-4 h-4 text-garda-text-muted" />
        <p className="text-xs text-garda-text-secondary">
          Phase {phase.phase}: Cooldown {phase.cooldown_min} menit antar trade
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 text-garda-text-muted" />
            <span className="text-garda-text-secondary">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
