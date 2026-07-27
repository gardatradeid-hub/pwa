/**
 * DEPRECATED — tier promotion is now handled server-side by close-trade
 * and sync-trade (see evaluation metrics recalculation + auto-promotion
 * after each close). The client reads the persisted evaluation_tier +
 * evaluation_metrics from profiles. This file is kept as a stub so
 * existing imports don't break; it always returns the current tier.
 */
export async function checkPhaseUpgrade(_userId: string, currentPhase: number): Promise<number> {
  return currentPhase;
}
