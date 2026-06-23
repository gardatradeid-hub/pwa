/**
 * CCXT Proxy — Supabase Edge Function
 *
 * Proxies exchange API calls via CCXT. API keys NEVER touch the client.
 * Supports: Binance, BingX, Bitfinex, Bitget, BitMEX, Bybit, CoinEx,
 *           Deribit, Gate.io, Huobi, Kraken, KuCoin, MEXC, OKX,
 *           Phemex, WhiteBIT, WOO X
 *
 * GET: action=ticker | ohlcv | balance | positions | markets
 * Query params: action, symbol, timeframe, limit
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';
import { logAudit } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const EXCHANGE_CLASSES: Record<string, any> = {
  binance: ccxt.binance,
  bingx: ccxt.bingx,
  bitfinex: ccxt.bitfinex,
  bitget: ccxt.bitget,
  bitmex: ccxt.bitmex,
  bybit: ccxt.bybit,
  coinex: ccxt.coinex,
  deribit: ccxt.deribit,
  gateio: ccxt.gate,
  huobi: ccxt.huobi,
  kraken: ccxt.kraken,
  kucoin: ccxt.kucoin,
  mexc: ccxt.mexc,
  okx: ccxt.okx,
  phemex: ccxt.phemex,
  whitebit: ccxt.whitebit,
  woox: ccxt.woox,
};

interface ProxyRequest {
  action: 'ticker' | 'ohlcv' | 'balance' | 'positions' | 'markets';
  symbol?: string;
  timeframe?: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const params: ProxyRequest = req.method === 'POST'
      ? await req.json()
      : { action: new URL(req.url).searchParams.get('action') as ProxyRequest['action'] };

    const { action, symbol, timeframe = '1h', limit = 100 } = params;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Missing required param: action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('exchange, api_key_encrypted, api_secret_encrypted')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.exchange || !profile?.api_key_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Exchange not connected. Please connect your exchange first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let apiKey: string;
    let apiSecret: string;
    try {
      apiKey = await decryptSecret(profile.api_key_encrypted);
      apiSecret = await decryptSecret(profile.api_secret_encrypted);
    } catch (e) {
      console.error('Failed to decrypt API credentials:', (e as Error).message);
      return new Response(
        JSON.stringify({ error: 'Stored credentials cannot be decrypted. Reconnect exchange.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    if (!ExchangeClass) {
      return new Response(
        JSON.stringify({ error: `Unsupported exchange: ${profile.exchange}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const exchange = new ExchangeClass({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: { defaultType: 'swap' },
    });

    let result: any;

    switch (action) {
      case 'ticker': {
        if (!symbol) return new Response(JSON.stringify({ error: 'symbol required for ticker' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const ticker = await exchange.fetchTicker(symbol);
        result = { symbol: ticker.symbol, last: ticker.last, bid: ticker.bid, ask: ticker.ask, high: ticker.high, low: ticker.low, volume: ticker.baseVolume || ticker.volume, change: ticker.change, changePercent: ticker.percentage, timestamp: ticker.timestamp };
        break;
      }
      case 'ohlcv': {
        if (!symbol) return new Response(JSON.stringify({ error: 'symbol required for ohlcv' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
        result = ohlcv.map((candle: number[]) => ({ time: candle[0] / 1000, open: candle[1], high: candle[2], low: candle[3], close: candle[4], volume: candle[5] }));
        break;
      }
      case 'balance': {
        try {
          // Try standard fetchBalance first (works for Bybit, Binance, etc.)
          const balance = await exchange.fetchBalance();
          let usdtTotal = balance.USDT?.total || balance.USDC?.total || 0;
          let usdtFree = balance.USDT?.free || balance.USDC?.free || 0;

          // If zero, try fetching with futures/swap wallet type
          if (!usdtTotal && exchange.has?.fetchBalance) {
            const futBalance = await exchange.fetchBalance({ type: 'future', settle: 'USDT' });
            usdtTotal = futBalance?.USDT?.total || futBalance?.total?.USDT || 0;
            usdtFree = futBalance?.USDT?.free || futBalance?.free?.USDT || 0;
          }

          result = { total_usdt: usdtTotal, available_usdt: usdtFree, used_usdt: (usdtTotal - usdtFree), balances: [] };
          if (usdtTotal > 0) {
            await supabase.from('equity_snapshots').insert({ user_id: user.id, balance_usdt: usdtTotal, high_water_mark: usdtTotal, drawdown_r: 0 });
          }
        } catch (_) {
          result = { total_usdt: 0, available_usdt: 0, used_usdt: 0, balances: [] };
        }
        break;
      }
      case 'positions': {
        const positions = await exchange.fetchPositions();
        result = positions.filter((p: any) => p.contracts !== undefined && p.contracts > 0).map((p: any) => ({ symbol: p.symbol, side: p.side, size: p.contracts, entry_price: p.entryPrice, mark_price: p.markPrice, unrealized_pnl: p.unrealizedPnl, liquidation_price: p.liquidationPrice }));
        break;
      }
      case 'markets': {
        const markets = await exchange.loadMarkets();
        result = Object.values(markets).filter((m: any) => m.linear && m.active && m.type === 'swap').map((m: any) => ({ symbol: m.symbol, base: m.base, quote: m.quote }));
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, data: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('CCXT Proxy error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message || 'Internal server error', type: error.constructor?.name || 'Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
