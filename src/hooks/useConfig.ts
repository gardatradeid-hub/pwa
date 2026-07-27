import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import {
  DEFAULT_PHASE_CONFIG,
  DEFAULT_TRADING_RULES,
} from '@/config/constants';
import type { AppConfig } from '@/types/guardrails';

/**
 * Hydrate the full `app_config` table from Supabase into a typed AppConfig
 * object. Falls back to the constants in src/config/constants.ts so the UI
 * stays usable if the row fetch fails.
 */
const FALLBACK_CONFIG: AppConfig = {
  saas_mode: { enabled: false, grace_period_days: 30 },
  trading_rules: DEFAULT_TRADING_RULES,
  phase_config: DEFAULT_PHASE_CONFIG,
  evaluation_tiers: {
    tiers: [
      { tier: 1, name: 'Bronze', name_id: 'Perunggu', color: '#CD7F32', icon: 'bronze', max_trades: 3, cooldown_min: 120, min_rr: 2.0, risk_per_trade_pct: 1.0, daily_loss_limit_r: 3, promotion: null },
      { tier: 2, name: 'Silver', name_id: 'Perak', color: '#C0C0C0', icon: 'silver', max_trades: 4, cooldown_min: 60, min_rr: 1.5, risk_per_trade_pct: 1.0, daily_loss_limit_r: 4, promotion: { min_win_rate: 0.40, min_trades: 30 } },
      { tier: 3, name: 'Gold', name_id: 'Emas', color: '#FFD700', icon: 'gold', max_trades: 5, cooldown_min: 0, min_rr: 1.0, risk_per_trade_pct: 1.5, daily_loss_limit_r: 5, promotion: { min_win_rate: 0.50, min_trades: 60, min_profit_factor: 1.5 } },
      { tier: 4, name: 'Platinum', name_id: 'Platinum', color: '#E5E4E2', icon: 'platinum', max_trades: 8, cooldown_min: 0, min_rr: 1.0, risk_per_trade_pct: 2.0, daily_loss_limit_r: 6, promotion: { min_win_rate: 0.55, min_trades: 120, min_profit_factor: 2.0, max_drawdown_pct: 15 } },
    ],
  },
  lock_config: {
    mode: 'FLAT',
    consecutive_loss_trigger: 3,
    flat_duration_hours: 12,
    tiered_schedule: [
      { count: 1, duration_hours: 12 },
      { count: 2, duration_hours: 24 },
      { count: 3, duration_hours: 48, trigger_review: true },
    ],
    tiered_reset: 'monthly',
  },
  revenge_config: { detection_window_min: 5, cooldown_penalty_min: 15 },
  supported_pairs: ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'BNB/USDT', 'SPCX/USDT'],
  supported_exchanges: ['bybit', 'binance', 'okx'],
};

async function fetchAppConfig(): Promise<AppConfig> {
  const { data, error } = await supabase.from('app_config').select('key, value');
  if (error || !data) return FALLBACK_CONFIG;

  const map: Record<string, unknown> = {};
  for (const row of data) map[row.key] = row.value;

  return {
    saas_mode: (map.saas_mode as AppConfig['saas_mode']) ?? FALLBACK_CONFIG.saas_mode,
    trading_rules: (map.trading_rules as AppConfig['trading_rules']) ?? FALLBACK_CONFIG.trading_rules,
    phase_config: (map.phase_config as AppConfig['phase_config']) ?? FALLBACK_CONFIG.phase_config,
    evaluation_tiers: (map.evaluation_tiers as AppConfig['evaluation_tiers']) ?? FALLBACK_CONFIG.evaluation_tiers,
    lock_config: (map.lock_config as AppConfig['lock_config']) ?? FALLBACK_CONFIG.lock_config,
    revenge_config: (map.revenge_config as AppConfig['revenge_config']) ?? FALLBACK_CONFIG.revenge_config,
    supported_pairs: (map.supported_pairs as string[]) ?? FALLBACK_CONFIG.supported_pairs,
    supported_exchanges: (map.supported_exchanges as string[]) ?? FALLBACK_CONFIG.supported_exchanges,
  };
}

export function useConfig() {
  const query = useQuery<AppConfig>({
    queryKey: ['app_config'],
    queryFn: fetchAppConfig,
    staleTime: 5 * 60_000, // 5 minutes — config rarely changes
    refetchOnWindowFocus: false,
  });

  return {
    config: query.data ?? FALLBACK_CONFIG,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
