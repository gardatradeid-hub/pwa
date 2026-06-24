import { supabase } from '@/config/supabase';
import { logManager } from '@/lib/LogManager';
import { useUserStore } from '@/store/useUserStore';
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
 * Supabase edge functions can occasionally fail with transient network errors
 * ("failed to send a request to the edge function"). We retry up to 3 times
 * with exponential backoff.
 */
async function invokeWithRetry(fnName: string, body: any, maxRetries = 3): Promise<any> {
  let lastError: any;
  const profile = useUserStore.getState().profile;
  const userId = profile?.id || undefined;
  const userEmail = profile?.email || undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(fnName, {
        body,
      });
      if (error) {
        lastError = error;
        // Network error — function was never reached
        logManager.enqueue({
          action: fnName === 'execute-trade' ? 'execute_trade' : 'close_trade',
          functionName: fnName,
          userId, userEmail,
          requestBody: body,
          responseStatus: 0,
          errorMessage: `Network error (attempt ${attempt}/${maxRetries}): ${error.message}`,
          timestamp: new Date().toISOString(),
        });
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
          continue;
        }
        throw new Error(`Gagal terhubung ke server. ${error.message || 'Coba lagi.'}`);
      }
      if (data?.error) {
        // Server-side error — function was reached but returned error
        logManager.enqueue({
          action: fnName === 'execute-trade' ? 'execute_trade' : 'close_trade',
          functionName: fnName,
          userId, userEmail,
          requestBody: body,
          responseStatus: 500,
          responseBody: data,
          errorMessage: data.error,
          timestamp: new Date().toISOString(),
        });
        throw new Error(data.error);
      }
      // Success
      logManager.enqueue({
        action: fnName === 'execute-trade' ? 'execute_trade' : 'close_trade',
        functionName: fnName,
        userId, userEmail,
        requestBody: body,
        responseStatus: 200,
        responseBody: data,
        timestamp: new Date().toISOString(),
      });
      return data;
    } catch (e: any) {
      if (e.message?.includes('Gagal terhubung')) throw e;
      lastError = e;
    }
  }
  throw lastError || new Error('Unknown error after retries');
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
