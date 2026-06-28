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
  if (error) return { success: false, error: error.message };
  return data as ProxyResponse<T>;
}

export async function fetchTicker(symbol: string): Promise<TickerData | null> {
  const res = await callProxy<TickerData>({ action: 'ticker', symbol });
  return res.success ? res.data! : null;
}

export async function fetchOHLCV(
  symbol: string, timeframe = '15m', limit = 100,
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

/**
 * Retry wrapper for critical operations (execute + close).
 * Retries up to 3 times with exponential backoff on transient network errors.
 * Catches "Failed to send a request to the Edge Function" which is a transient
 * Supabase infrastructure error, not a logic error.
 */
async function invokeWithRetry(fnName: string, body: any, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, { body });
      if (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        const msg = error.message || 'Coba lagi.';
        throw new Error(`Gagal terhubung ke server: ${msg}`);
      }
      if (data?.error) throw new Error(data.error);
      return data;
    } catch (e: any) {
      if (/Gagal terhubung|Failed to send/.test(e.message || '')) throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('Gagal terhubung ke server (maksimum percobaan).');
}

export async function executeTrade(params: {
  symbol: string; side: 'long' | 'short';
  entryPrice: number; stopLoss: number; rrRatio: number;
}): Promise<any> {
  return invokeWithRetry('execute-trade', params);
}

export async function closeTrade(tradeId: string): Promise<any> {
  return invokeWithRetry('close-trade', { tradeId });
}
