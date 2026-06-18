import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { executeTrade, closeTrade } from '@/lib/ccxt-proxy';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import type { Trade, TradeSide } from '@/types/trade';

/**
 * Trade list + open-position + mutation helpers.
 *
 * Source of truth = Supabase `trades` table. Edge functions
 * execute-trade / close-trade write to that table; we invalidate the cache
 * after every mutation so the UI re-reads.
 */

async function fetchTradeList(userId: string): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .order('opened_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as Trade[];
}

async function fetchOpenTrade(userId: string): Promise<Trade | null> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return (data?.[0] as Trade | undefined) ?? null;
}

export function useTradeList() {
  const userId = useUserStore((s) => s.profile?.id);
  return useQuery<Trade[]>({
    queryKey: ['trades', userId],
    queryFn: () => (userId ? fetchTradeList(userId) : Promise.resolve([])),
    enabled: !!userId,
    staleTime: 15_000,
  });
}

export function useOpenTrade() {
  const userId = useUserStore((s) => s.profile?.id);
  const setActiveTrade = useTradeStore((s) => s.setActiveTrade);

  return useQuery<Trade | null>({
    queryKey: ['trades', 'open', userId],
    queryFn: async () => {
      const t = userId ? await fetchOpenTrade(userId) : null;
      setActiveTrade(t);
      return t;
    },
    enabled: !!userId,
    refetchInterval: 10_000, // poll while open
  });
}

export interface ExecuteTradeInput {
  symbol: string;
  side: TradeSide;
  entryPrice: number;
  stopLoss: number;
  rrRatio: number;
}

export function useExecuteTrade() {
  const qc = useQueryClient();
  const userId = useUserStore((s) => s.profile?.id);

  return useMutation({
    mutationFn: (input: ExecuteTradeInput) => executeTrade(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trades', userId] });
      qc.invalidateQueries({ queryKey: ['trades', 'open', userId] });
      qc.invalidateQueries({ queryKey: ['positions'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
      qc.invalidateQueries({ queryKey: ['daily_stats', userId] });
    },
  });
}

export function useCloseTrade() {
  const qc = useQueryClient();
  const userId = useUserStore((s) => s.profile?.id);
  const setShowPostTradeModal = useTradeStore((s) => s.setShowPostTradeModal);

  return useMutation({
    mutationFn: (tradeId: string) => closeTrade(tradeId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['trades', userId] });
      qc.invalidateQueries({ queryKey: ['trades', 'open', userId] });
      qc.invalidateQueries({ queryKey: ['positions'] });
      qc.invalidateQueries({ queryKey: ['balance'] });
      qc.invalidateQueries({ queryKey: ['daily_stats', userId] });
      // Trigger the mandatory PostTradeLog modal (spec §8.7).
      const tradeId = data?.trade?.id;
      if (tradeId) setShowPostTradeModal(true, tradeId);
    },
  });
}

/**
 * Convenience facade — one hook returning everything a page needs.
 */
export function useTrades() {
  const list = useTradeList();
  const open = useOpenTrade();
  const execute = useExecuteTrade();
  const close = useCloseTrade();

  return {
    trades: list.data ?? [],
    isLoading: list.isLoading,
    openTrade: open.data ?? null,
    executeTrade: execute.mutate,
    executeTradeAsync: execute.mutateAsync,
    isExecuting: execute.isPending,
    executeError: execute.error,
    closeTrade: close.mutate,
    closeTradeAsync: close.mutateAsync,
    isClosing: close.isPending,
  };
}
