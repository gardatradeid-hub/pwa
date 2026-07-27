import { useMemo } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useConfig } from './useConfig';
import type { EvaluationTier, EvaluationMetrics } from '@/types/user';

export interface TierProgress {
  totalTrades: number;
  totalWins: number;
  winRate: number;
  profitFactor: number;
  totalPnlR: number;
  maxDrawdownR: number;
  requiredTrades: number;
  requiredWinRate: number;
  requiredProfitFactor?: number;
  requiredMaxDrawdown?: number;
  ready: boolean;
}

/**
 * Derive tier info + promotion progress for the UI.
 *
 * Server-side (close-trade + sync-trade) auto-calculates metrics and
 * auto-promotes when criteria are met. This hook reads the persisted
 * evaluation_metrics and evaluation_tier from the profile, then
 * cross-references with app_config.evaluation_tiers to show:
 *  - currentTier: EvaluationTier
 *  - nextTier: EvaluationTier | null
 *  - progress: 0–1 readiness for the next promotion
 */
export function usePhase() {
  const profile = useUserStore((s) => s.profile);
  const { config } = useConfig();

  const tiers: EvaluationTier[] = (config.evaluation_tiers as any)?.tiers || [];
  const currentTierNum = profile?.evaluation_tier ?? 1;

  const currentTier = useMemo(
    () => tiers.find((t) => t.tier === currentTierNum) ?? tiers[0],
    [tiers, currentTierNum],
  );

  const nextTier = useMemo(
    () => tiers.find((t) => t.tier === currentTierNum + 1) ?? null,
    [tiers, currentTierNum],
  );

  const progress = useMemo((): TierProgress => {
    const m: EvaluationMetrics = profile?.evaluation_metrics ?? {
      total_trades: 0, total_wins: 0, total_losses: 0,
      win_rate: 0, profit_factor: 0, total_pnl_r: 0, max_drawdown_r: 0,
    };

    if (!nextTier?.promotion) {
      // Already at top tier or no promotion criteria defined
      return {
        totalTrades: m.total_trades,
        totalWins: m.total_wins,
        winRate: m.win_rate,
        profitFactor: m.profit_factor,
        totalPnlR: m.total_pnl_r,
        maxDrawdownR: m.max_drawdown_r,
        requiredTrades: 0,
        requiredWinRate: 0,
        ready: false,
      };
    }

    const p = nextTier.promotion;
    const wrOk = !p.min_win_rate || m.win_rate >= p.min_win_rate * 100;
    const tradesOk = !p.min_trades || m.total_trades >= p.min_trades;
    const pfOk = !p.min_profit_factor || m.profit_factor >= p.min_profit_factor;
    const ddOk = !p.max_drawdown_pct || m.max_drawdown_r <= p.max_drawdown_pct;

    return {
      totalTrades: m.total_trades,
      totalWins: m.total_wins,
      winRate: m.win_rate,
      profitFactor: m.profit_factor,
      totalPnlR: m.total_pnl_r,
      maxDrawdownR: m.max_drawdown_r,
      requiredTrades: p.min_trades ?? 0,
      requiredWinRate: (p.min_win_rate ?? 0) * 100,
      requiredProfitFactor: p.min_profit_factor,
      requiredMaxDrawdown: p.max_drawdown_pct,
      ready: wrOk && tradesOk && pfOk && ddOk,
    };
  }, [profile?.evaluation_metrics, nextTier]);

  return { currentTier, nextTier, progress };
}
