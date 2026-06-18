import { useEffect, useMemo } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useConfig } from './useConfig';
import { useTradeList } from './useTrades';
import { checkPhaseUpgrade } from '@/lib/phase-calculator';
import type { PhaseRule } from '@/types/guardrails';

/**
 * Derive everything phase-related the UI needs.
 *  - currentPhase: PhaseRule for the user's current_phase
 *  - nextPhase: PhaseRule one step up, or null if already Phase 3
 *  - progressToNext: 0–1 readiness toward unlocking next phase (WR + trades)
 *  - triggerPhaseRecheck: server-side phase upgrade attempt
 */
export function usePhase() {
  const profile = useUserStore((s) => s.profile);
  const { config } = useConfig();
  const { data: trades } = useTradeList();

  const phaseList = config.phase_config.phases as PhaseRule[];
  const currentPhaseNum = profile?.current_phase ?? 1;

  const currentPhase = useMemo(
    () => phaseList.find((p) => p.phase === currentPhaseNum) ?? phaseList[0],
    [phaseList, currentPhaseNum],
  );

  const nextPhase = useMemo(
    () => phaseList.find((p) => p.phase === currentPhaseNum + 1) ?? null,
    [phaseList, currentPhaseNum],
  );

  const progress = useMemo(() => {
    if (!nextPhase?.unlock_trades || !nextPhase.unlock_wr || !trades) {
      return { trades: 0, totalTrades: 0, wr: 0, requiredTrades: 0, requiredWr: 0, ready: false };
    }
    const closed = trades.filter((t) => t.status === 'closed');
    const recent = closed.slice(0, nextPhase.unlock_trades);
    const wins = recent.filter((t) => (t.pnl_r ?? 0) > 0).length;
    const wr = recent.length > 0 ? wins / recent.length : 0;
    return {
      trades: recent.length,
      totalTrades: closed.length,
      wr,
      requiredTrades: nextPhase.unlock_trades,
      requiredWr: nextPhase.unlock_wr,
      ready: recent.length >= nextPhase.unlock_trades && wr >= nextPhase.unlock_wr,
    };
  }, [trades, nextPhase]);

  // Re-check phase upgrade once after each fresh load of the trade list.
  useEffect(() => {
    if (!profile?.id || !progress.ready) return;
    checkPhaseUpgrade(profile.id, currentPhaseNum).catch(() => {
      /* non-blocking */
    });
  }, [profile?.id, currentPhaseNum, progress.ready]);

  return {
    currentPhase,
    nextPhase,
    progress,
  };
}
