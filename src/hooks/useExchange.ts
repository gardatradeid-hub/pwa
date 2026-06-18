import { useQuery } from '@tanstack/react-query';
import {
  fetchTicker,
  fetchOHLCV,
  fetchBalance,
  fetchPositions,
} from '@/lib/ccxt-proxy';
import type { TickerData, OHLCVData, ExchangeBalance } from '@/types/exchange';

/**
 * Thin TanStack Query wrappers around the CCXT proxy edge function.
 * All real exchange calls are server-side; this hook only manages
 * caching/refetch policy on the client.
 */

const TICKER_REFETCH_MS = 5_000;
const OHLCV_STALE_MS = 30_000;
const BALANCE_STALE_MS = 30_000;
const POSITIONS_REFETCH_MS = 10_000;

export function useTicker(symbol: string | null | undefined, enabled = true) {
  return useQuery<TickerData | null>({
    queryKey: ['ticker', symbol],
    queryFn: () => (symbol ? fetchTicker(symbol) : Promise.resolve(null)),
    enabled: !!symbol && enabled,
    refetchInterval: symbol && enabled ? TICKER_REFETCH_MS : false,
    staleTime: 1_000,
  });
}

export function useOHLCV(
  symbol: string | null | undefined,
  timeframe = '15m',
  limit = 100,
  enabled = true,
) {
  return useQuery<OHLCVData[]>({
    queryKey: ['ohlcv', symbol, timeframe, limit],
    queryFn: () =>
      symbol ? fetchOHLCV(symbol, timeframe, limit) : Promise.resolve([]),
    enabled: !!symbol && enabled,
    staleTime: OHLCV_STALE_MS,
  });
}

export function useBalance(enabled = true) {
  return useQuery<ExchangeBalance | null>({
    queryKey: ['balance'],
    queryFn: () => fetchBalance(),
    enabled,
    staleTime: BALANCE_STALE_MS,
  });
}

export function usePositions(enabled = true) {
  return useQuery({
    queryKey: ['positions'],
    queryFn: () => fetchPositions(),
    enabled,
    refetchInterval: enabled ? POSITIONS_REFETCH_MS : false,
  });
}

/**
 * Composite hook returning everything a trade screen needs in one place.
 */
export function useExchange(symbol: string | null | undefined) {
  const ticker = useTicker(symbol);
  const ohlcv = useOHLCV(symbol);
  const balance = useBalance();
  const positions = usePositions();

  return {
    ticker: ticker.data ?? null,
    isTickerLoading: ticker.isLoading,
    ohlcv: ohlcv.data ?? [],
    isOhlcvLoading: ohlcv.isLoading,
    balance: balance.data ?? null,
    isBalanceLoading: balance.isLoading,
    positions: positions.data ?? [],
    isPositionsLoading: positions.isLoading,
    refetchAll: () => {
      ticker.refetch();
      ohlcv.refetch();
      balance.refetch();
      positions.refetch();
    },
  };
}
