/**
 * Close Trade — Supabase Edge Function
 *
 * POST /functions/v1/close-trade  Body: { tradeId }
 *
 * Every return path logs audit details. Catch is 100 % crash-proof
 * (zero external variable references).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';
import { logAudit, Action } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXCHANGE_CLASSES: Record<string, any> = {
  binance: ccxt.binance, bingx: ccxt.bingx, bitfinex: ccxt.bitfinex,
  bitget: ccxt.bitget, bitmex: ccxt.bitmex, bybit: ccxt.bybit,
  coinex: ccxt.coinex, deribit: ccxt.deribit, gateio: ccxt.gate,
  huobi: ccxt.huobi, kraken: ccxt.kraken, kucoin: ccxt.kucoin,
  mexc: ccxt.mexc, okx: ccxt.okx, phemex: ccxt.phemex,
  whitebit: ccxt.whitebit, woox: ccxt.woox,
};

interface CloseTradeRequest { tradeId: string; }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Earliest possible snapshot for crash-proof catch
  const __reqId = crypto.randomUUID().slice(0, 8);

  try {
    // --- AUTH ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // --- HELPER: audit log that never crashes ----
    const __log = (s: number, msg?: string, extra?: Record<string, unknown>) => {
      try { logAudit(supabase, { userId: user.id, action: Action.CLOSE_TRADE, functionName: 'close-trade', requestBody: extra || { tradeId }, responseStatus: s, errorMessage: msg }); } catch (_) {}
    };

    // --- PARSE ---
    const { tradeId }: CloseTradeRequest = await req.json();
    if (!tradeId) { __log(400, 'Missing tradeId'); return json({ error: 'Missing tradeId' }, 400); }

    // --- LOAD TRADE ---
    const { data: trade, error: tradeErr } = await supabase.from('trades').select('*').eq('id', tradeId).eq('user_id', user.id).single();
    if (tradeErr || !trade) { __log(404, 'Trade not found'); return json({ error: 'Trade not found' }, 404); }
    if (trade.status !== 'open') { __log(400, 'Already closed'); return json({ error: 'Trade is already closed' }, 400); }

    // --- LOAD PROFILE ---
    const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profErr || !profile || !profile.exchange || !profile.api_key_encrypted || !profile.api_secret_encrypted) { __log(400, 'Exchange not connected'); return json({ error: 'Exchange not connected' }, 400); }

    // --- DECRYPT ---
    let apiKey: string, apiSecret: string;
    try { apiKey = await decryptSecret(profile.api_key_encrypted); apiSecret = await decryptSecret(profile.api_secret_encrypted); }
    catch (_) { __log(500, 'Decrypt failed'); return json({ error: 'Decrypt failed' }, 500); }

    // --- LOAD CONFIG ---
    const { data: cfg } = await supabase.from('app_config').select('key, value');
    const conf: Record<string, any> = {};
    if (cfg) for (const r of cfg) conf[r.key] = r.value;
    const tradingRules = conf.trading_rules;
    const lockConfig = conf.lock_config;

    // --- INIT EXCHANGE + CLOSE ---
    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    const exchange = new ExchangeClass({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'swap' } });
    await exchange.loadMarkets();

    const swapSymbol = (trade.symbol || '').includes(':') ? trade.symbol : `${trade.symbol}:USDT`;
    const mkt = (exchange as any).markets?.[swapSymbol];
    const marketSymbol = mkt?.id ?? trade.symbol;

    // Bybit hedge mode: close order needs the same positionIdx as the open
    // side (1=long, 2=short). One-way mode uses 0. Mirrors execute-trade.
    let bybitPositionIdx = 0;
    if (profile.exchange === 'bybit') {
      try {
        const signed = exchange.sign(`/v5/position/list?category=linear&symbol=${marketSymbol}`, 'private', 'GET');
        const resp = await fetch(`https://api.bybit.com/v5/position/list?category=linear&symbol=${marketSymbol}`, { headers: signed.headers });
        const j = await resp.json();
        const posList: any[] = j?.result?.list || [];
        const isHedge = posList.some((p: any) => Number(p.positionIdx) === 1 || Number(p.positionIdx) === 2);
        if (isHedge) bybitPositionIdx = trade.side === 'long' ? 1 : 2;
      } catch (_) {}
    }

    const closeSide: 'buy' | 'sell' = trade.side === 'long' ? 'sell' : 'buy';
    const closeParams: Record<string, any> = { reduceOnly: true };
    if (profile.exchange === 'bybit') closeParams.positionIdx = bybitPositionIdx;
    const closeOrder = await exchange.createOrder(marketSymbol, 'market', closeSide, Number(trade.quantity), undefined, closeParams);

    // Cancel SL + TP. Gate.io's SL/TP live on a SEPARATE endpoint
    // (/futures/usdt/price_orders/{id}, not /orders/{id}), so the unified
    // cancelOrder() hits the wrong path. Use native DELETE for Gate.io,
    // CCXT cancelOrder for everyone else (the reduceOnly flag on those
    // orders means they self-cancel on close anyway, but cleaning up
    // keeps the exchange UI tidy and prevents stale orders accumulating).
    const cancelGateioPriceOrder = async (orderId: string) => {
      const signed = (exchange as any).sign(
        `usdt/price_orders/${orderId}`,
        ['private', 'futures'],
        'DELETE',
        {},
      );
      await fetch(signed.url, { method: 'DELETE', headers: signed.headers });
    };
    try {
      if (trade.exchange_sl_order_id) {
        if (profile.exchange === 'gateio') await cancelGateioPriceOrder(trade.exchange_sl_order_id);
        else await exchange.cancelOrder(trade.exchange_sl_order_id, marketSymbol);
      }
    } catch (_) {}
    try {
      if (trade.exchange_tp_order_id) {
        if (profile.exchange === 'gateio') await cancelGateioPriceOrder(trade.exchange_tp_order_id);
        else await exchange.cancelOrder(trade.exchange_tp_order_id, marketSymbol);
      }
    } catch (_) {}

    // --- RESOLVE EXIT PRICE ---
    // CCXT market-order response often has null .price/.average until the fill
    // settles. Re-fetch the order to get the average fill price; fall back to
    // ticker last, and only then to entry_price (which would record P&L = 0).
    let exitPrice = Number(closeOrder.average ?? closeOrder.price ?? 0);
    if (!exitPrice && closeOrder.id) {
      for (let i = 0; i < 5 && !exitPrice; i++) {
        await new Promise(r => setTimeout(r, 600));
        try {
          const o = await exchange.fetchOrder(closeOrder.id, marketSymbol);
          exitPrice = Number(o?.average ?? o?.price ?? 0);
        } catch (_) {}
      }
    }
    if (!exitPrice) {
      try {
        const ticker = await exchange.fetchTicker(marketSymbol);
        exitPrice = Number(ticker?.last ?? ticker?.close ?? 0);
      } catch (_) {}
    }
    if (!exitPrice) exitPrice = Number(trade.entry_price);

    // P&L is per-coin × coin amount. Gate.io stores `quantity` as integer
    // contracts, where 1 contract = quanto_multiplier coins; everyone else
    // stores it as the coin amount directly.
    let coinQty = Number(trade.quantity);
    if (profile.exchange === 'gateio') {
      const quanto = Number((mkt as any)?.info?.quanto_multiplier ?? 0);
      if (quanto > 0) coinQty = Number(trade.quantity) * quanto;
    }

    let pnlUsdt: number, pnlR: number;
    if (trade.side === 'long') {
      pnlUsdt = (exitPrice - Number(trade.entry_price)) * coinQty;
      pnlR = (exitPrice - Number(trade.entry_price)) / (Number(trade.entry_price) - Number(trade.stop_loss));
    } else {
      pnlUsdt = (Number(trade.entry_price) - exitPrice) * coinQty;
      pnlR = (Number(trade.entry_price) - exitPrice) / (Number(trade.stop_loss) - Number(trade.entry_price));
    }
    const isWin = pnlR > 0;

    // --- UPDATE TRADE ---
    const { data: updatedTrade } = await supabase.from('trades').update({
      status: 'closed', exit_price: exitPrice, pnl_usdt: Math.round(pnlUsdt * 100) / 100,
      pnl_r: Math.round(pnlR * 100) / 100, closed_at: new Date().toISOString(),
    }).eq('id', tradeId).select().single();

    // --- UPDATE DAILY STATS ---
    const today = new Date().toISOString().split('T')[0];
    // .maybeSingle() — first close of the day may have no row yet (PGRST116 guard)
    const { data: dstats } = await supabase.from('daily_stats').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
    const newLosses = (dstats?.losses || 0) + (isWin ? 0 : 1);
    const newWins = (dstats?.wins || 0) + (isWin ? 1 : 0);
    const newConsecutiveLosses = isWin ? 0 : (dstats?.consecutive_losses || 0) + 1;
    const newDailyLossR = Number(dstats?.daily_loss_r || 0) + (pnlR < 0 ? Math.abs(Number(pnlR)) : 0);
    const newPnlR = Number(dstats?.pnl_r || 0) + Number(pnlR);
    const newPnlUsdt = Number(dstats?.pnl_usdt || 0) + pnlUsdt;

    await supabase.from('daily_stats').upsert({
      user_id: user.id, date: today, wins: newWins, losses: newLosses,
      pnl_r: Math.round(newPnlR * 100) / 100, pnl_usdt: Math.round(newPnlUsdt * 100) / 100,
      daily_loss_r: Math.round(newDailyLossR * 100) / 100, consecutive_losses: newConsecutiveLosses,
      last_trade_closed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' });

    // --- CHECK LOCKS ---
    let lockTriggered: any = null;
    if (newConsecutiveLosses >= lockConfig.consecutive_loss_trigger) {
      const { data: pastLocks } = await supabase.from('lock_events').select('*').eq('user_id', user.id).gte('locked_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());
      const cnt = (pastLocks?.length || 0) + 1;
      let dur = lockConfig.flat_duration_hours;
      let review = false;
      if (lockConfig.mode === 'TIERED' && lockConfig.tiered_schedule) {
        const tier = lockConfig.tiered_schedule.find((t: any) => t.count === cnt);
        dur = tier?.duration_hours || lockConfig.tiered_schedule[lockConfig.tiered_schedule.length - 1]?.duration_hours || dur;
        review = tier?.trigger_review || false;
      }
      await supabase.from('lock_events').insert({
        user_id: user.id, lock_type: 'consecutive_loss', duration_hours: dur,
        lock_count_this_month: cnt, unlocks_at: new Date(Date.now() + dur * 3600000).toISOString(),
      });
      lockTriggered = { type: 'consecutive_loss', durationHours: dur, lockCountThisMonth: cnt, triggerReview: review };
    }
    if (!lockTriggered && newDailyLossR >= tradingRules.daily_loss_limit_r) {
      await supabase.from('lock_events').insert({
        user_id: user.id, lock_type: 'daily_loss', duration_hours: 12,
        lock_count_this_month: 1, unlocks_at: new Date(Date.now() + 43200000).toISOString(),
      });
      lockTriggered = { type: 'daily_loss', durationHours: 12, lockCountThisMonth: 1, triggerReview: false };
    }

    let evaluationTriggered = false;
    const { data: snaps } = await supabase.from('equity_snapshots').select('*').eq('user_id', user.id).order('snapshot_at', { ascending: false }).limit(1);
    if (snaps && snaps.length > 0) {
      const bal = Number(snaps[0].balance_usdt);
      const hwm = Number(snaps[0].high_water_mark);
      if (hwm > 0 && ((hwm - bal) / hwm) * 100 >= tradingRules.total_drawdown_r) evaluationTriggered = true;
    }

    // --- SNAPSHOT ---
    // Exchange has defaultType:'swap' from constructor, so fetchBalance() without
    // params returns the futures wallet for Bybit/OKX/Gate/etc. Binance-style
    // {type:'future'} fallback only fires if the default lookup returns zero.
    try {
      let bal = await exchange.fetchBalance();
      let total = bal?.USDT?.total || bal?.USDC?.total || 0;
      if (!total) {
        try {
          bal = await exchange.fetchBalance({ type: 'future', settle: 'USDT' });
          total = bal?.USDT?.total || bal?.USDC?.total || 0;
        } catch (_) {}
      }
      const hwm = Math.max(total, snaps?.[0]?.high_water_mark || 0);
      await supabase.from('equity_snapshots').insert({ user_id: user.id, balance_usdt: total, high_water_mark: hwm, drawdown_r: hwm > 0 ? Math.round(((hwm - total) / hwm) * 10000) / 100 : 0 });
    } catch (_) {}

    // --- AUDIT + RETURN ---
    __log(200, undefined, { success: true, tradeId, symbol: trade.symbol, pnl: Math.round(pnlUsdt * 100) / 100 });
    return json({
      success: true, trade: updatedTrade,
      pnl: { usdt: Math.round(pnlUsdt * 100) / 100, r: Math.round(pnlR * 100) / 100, isWin },
      lockTriggered, evaluationTriggered,
      dailyStats: { tradesToday: (dstats?.trades_count || 0) + 1, consecutiveLosses: newConsecutiveLosses, dailyLossR: Math.round(newDailyLossR * 100) / 100 },
    });

  } catch (error: any) {
    const msg = (typeof error?.message === 'string' ? error.message : 'unknown').slice(0, 500);
    console.error(`close-trade [${__reqId}]`, msg);
    try {
      const cl = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await cl.from('audit_logs').insert({ action: 'close_trade', function_name: 'close-trade', response_status: 500, error_message: msg + ' [' + __reqId + ']', created_at: new Date().toISOString() });
    } catch (_) {}
    return json({ success: false, error: msg }, 500);
  }
});
