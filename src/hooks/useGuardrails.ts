import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { runGuardrailChecks, getBlockedChecks, getDefaultTierRules, type TierRules } from '@/lib/guardrail-engine';
import type { GuardrailContext } from '@/lib/guardrail-engine';
import { useConfig } from './useConfig';
import { useTrades } from './useTrades';
import type { DailyStats } from '@/types/guardrails';

async function fetchDailyStats(userId: string): Promise<DailyStats | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();
  if (error) return null;
  return (data as DailyStats | null) ?? null;
}

async function fetchLatestEquity(userId: string) {
  const { data } = await supabase
    .from('equity_snapshots')
    .select('balance_usdt, high_water_mark')
    .eq('user_id', userId)
    .order('snapshot_at', { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export function useGuardrails() {
  const profile = useUserStore((s) => s.profile);
  const userId = profile?.id;
  const balance = useUserStore((s) => s.balance);
  const form = useTradeStore((s) => s.form);
  const { config } = useConfig();
  const { openTrade, trades } = useTrades();

  // Resolve the user's actual tier rules (tier config + per-user overrides)
  const tier: TierRules = useMemo(() => {
    const defaults = getDefaultTierRules();
    const tiers: any[] = (config.evaluation_tiers as any)?.tiers || [];
    const userTier = profile?.evaluation_tier ?? 1;
    const tierCfg = tiers.find((t: any) => t.tier === userTier) || {};
    const overrides = profile?.rule_overrides || {};

    return {
      max_trades: overrides.max_trades ?? tierCfg.max_trades ?? defaults.max_trades,
      min_rr: overrides.min_rr ?? tierCfg.min_rr ?? defaults.min_rr,
      cooldown_min: overrides.cooldown_min ?? tierCfg.cooldown_min ?? defaults.cooldown_min,
      risk_per_trade_pct: overrides.risk_per_trade_pct ?? tierCfg.risk_per_trade_pct ?? defaults.risk_per_trade_pct,
      daily_loss_limit_r: overrides.daily_loss_limit_r ?? tierCfg.daily_loss_limit_r ?? defaults.daily_loss_limit_r,
      leverage: overrides.leverage ?? tierCfg.leverage ?? defaults.leverage,
    };
  }, [config.evaluation_tiers, profile?.evaluation_tier, profile?.rule_overrides]);

  const { data: dailyStats } = useQuery<DailyStats | null>({
    queryKey: ['daily_stats', userId],
    queryFn: () => (userId ? fetchDailyStats(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 15_000,
  });

  const { data: equity } = useQuery({
    queryKey: ['equity_snapshot', userId],
    queryFn: () => (userId ? fetchLatestEquity(userId) : Promise.resolve(null)),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const lastClosed = useMemo(
    () => trades.find((t) => t.status === 'closed') ?? null,
    [trades],
  );

  const context: GuardrailContext = useMemo(() => {
    const usableBalance = balance ?? Number(equity?.balance_usdt ?? 0) ?? 0;
    const hwm = Number(equity?.high_water_mark ?? usableBalance);
    const drawdownR = hwm > 0 ? ((hwm - usableBalance) / hwm) * 100 : 0;
    return {
      balance: usableBalance,
      tradesToday: dailyStats?.trades_count ?? 0,
      activePosition: !!openTrade,
      openTrade,
      dailyLossR: Number(dailyStats?.daily_loss_r ?? 0),
      drawdownR,
      lastClosedTrade: lastClosed,
      revengeWindowMin: config.revenge_config.detection_window_min,
      form: {
        symbol: form.symbol,
        side: form.side,
        entryPrice: form.entryPrice,
        rrRatio: form.rrRatio,
      },
    };
  }, [balance, equity, dailyStats, openTrade, lastClosed, config.revenge_config.detection_window_min, form]);

  const checks = useMemo(() => runGuardrailChecks(context, tier), [context, tier]);
  const blocked = useMemo(() => getBlockedChecks(checks), [checks]);
  const canTrade = blocked.length === 0;
  const firstBlock = blocked[0] ?? null;

  return {
    checks,
    blocked,
    canTrade,
    firstBlock,
    context,
    tier,
  };
}
