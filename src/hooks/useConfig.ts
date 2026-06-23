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
