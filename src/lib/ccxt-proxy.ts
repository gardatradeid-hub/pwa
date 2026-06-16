import { supabase } from '@/config/supabase';
import type { TickerData, OHLCVData, ExchangeBalance } from '@/types/exchange';

/**
 * Client-side CCXT proxy — calls Supabase Edge Function.
 * API keys never touch the client. Edge Function decrypts and forwards.
 */

type ProxyAction = 'ticker' | 'ohlcv' | 'balance' | 'positions' | 'markets';

interface ProxyParams {
  action: ProxyAction;
  symbol?: string;
  timeframe?: string;
  limit?: number;
}

interface ProxyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callProxy<T>(params: ProxyParams): Promise<ProxyResponse<T>> {
  const { data, error } = await supabase.functions.invoke('ccxt-proxy', {
    body: params,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return data as ProxyResponse<T>;
}

export async function fetchTicker(symbol: string): Promise<TickerData | null> {
  const res = await callProxy<TickerData>({ action: 'ticker', symbol });
  return res.success ? res.data! : null;
}

export async function fetchOHLCV(
  symbol: string,
  timeframe = '15m',
  limit = 100
): Promise<OHLCVData[]> {
  const res = await callProxy<OHLCVData[]>({ action: 'ohlcv', symbol, timeframe, limit });
  return res.success && res.data ? res.data : [];
}

export async function fetchBalance(): Promise<ExchangeBalance | null> {
  const res = await callProxy<ExchangeBalance>({ action: 'balance' });
  return res.success ? res.data! : null;
}

export async function fetchPositions() {
  const res = await callProxy<any[]>({ action: 'positions' });
  return res.success && res.data ? res.data : [];
}

export async function executeTrade(params: {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  rrRatio: number;
}): Promise<any> {
  const { data, error } = await supabase.functions.invoke('execute-trade', {
    body: params,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function closeTrade(tradeId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('close-trade', {
    body: { tradeId },
  });
  if (error) throw new Error(error.message);
  return data;
}
