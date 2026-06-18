import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { runGuardrailChecks, getBlockedChecks } from '@/lib/guardrail-engine';
import type { GuardrailContext } from '@/lib/guardrail-engine';
import { useConfig } from './useConfig';
import { useTrades } from './useTrades';
import type { DailyStats } from '@/types/guardrails';

/**
 * Aggregate everything the order panel needs to render the dot-row of 12
 * guardrails, decide whether Long/Short is enabled, and surface which
 * specific rule is blocking.
 *
 * Server is still authoritative — this is a UX optimization.
 */
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
  const userId = useUserStore((s) => s.profile?.id);
  const balance = useUserStore((s) => s.balance);
  const form = useTradeStore((s) => s.form);
  const { config } = useConfig();
  const { openTrade, trades } = useTrades();

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

  const checks = useMemo(() => runGuardrailChecks(context), [context]);
  const blocked = useMemo(() => getBlockedChecks(checks), [checks]);
  const canTrade = blocked.length === 0;
  const firstBlock = blocked[0] ?? null;

  return {
    checks,
    blocked,
    canTrade,
    firstBlock,
    context,
  };
}
