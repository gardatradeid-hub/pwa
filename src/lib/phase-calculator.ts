import { supabase } from '@/config/supabase';
import { DEFAULT_PHASE_CONFIG } from '@/config/constants';

/**
 * Calculate if user qualifies for phase upgrade.
 * Phase 2: >=40% WR after 30 trades
 * Phase 3: >=50% WR after 60 trades
 */
export async function checkPhaseUpgrade(userId: string, currentPhase: number): Promise<number> {
  if (currentPhase >= 3) return 3;

  const config = DEFAULT_PHASE_CONFIG.phases;
  const nextPhase = config.find(p => p.phase === currentPhase + 1);
  if (!nextPhase || !nextPhase.unlock_trades || !nextPhase.unlock_wr) return currentPhase;

  // Count closed trades
  const { count: totalTrades, error: countErr } = await supabase
    .from('trades')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'closed');

  if (countErr || !totalTrades) return currentPhase;

  // Need minimum trades
  if (totalTrades < nextPhase.unlock_trades) return currentPhase;

  // Check last N trades for WR requirement
  const { data: recentTrades } = await supabase
    .from('trades')
    .select('pnl_r')
    .eq('user_id', userId)
    .eq('status', 'closed')
    .order('closed_at', { ascending: false })
    .limit(nextPhase.unlock_trades);

  if (!recentTrades || recentTrades.length < nextPhase.unlock_trades) return currentPhase;

  const wins = recentTrades.filter(t => (t.pnl_r || 0) > 0).length;
  const wr = wins / recentTrades.length;

  if (wr >= nextPhase.unlock_wr) {
    // Upgrade phase
    await supabase
      .from('profiles')
      .update({ current_phase: currentPhase + 1 })
      .eq('id', userId);

    return currentPhase + 1;
  }

  return currentPhase;
}
