/**
 * Sync Trade — Supabase Edge Function
 *
 * POST /functions/v1/sync-trade  Body: { tradeId }
 *
 * Purpose: reconcile a locally-open trade with the exchange. If the
 * exchange no longer shows an open position for the trade's symbol,
 * the trade was closed there by a triggered SL or TP order — the
 * function determines which one filled, records the actual exit
 * price/fill from the order history, updates trade + daily_stats +
 * lock_events (same downstream effects as close-trade), and returns
 * a normal close response.
 *
 * If the position IS still open, returns { success: true, stillOpen: true }
 * and touches nothing. Safe to poll every few seconds from the client.
 *
 * Never sends a new order to the exchange; that would race with an
 * SL/TP that was in the middle of filling.
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

interface SyncTradeRequest { tradeId: string; }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

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

    // --- PARSE ---
    const { tradeId }: SyncTradeRequest = await req.json();
    if (!tradeId) return json({ error: 'Missing tradeId' }, 400);

    const __log = (s: number, msg?: string, extra?: Record<string, unknown>) => {
      try { logAudit(supabase, { userId: user.id, action: Action.CLOSE_TRADE, functionName: 'sync-trade', requestBody: extra || { tradeId }, responseStatus: s, errorMessage: msg }); } catch (_) {}
    };

    // --- LOAD TRADE ---
    const { data: trade, error: tradeErr } = await supabase.from('trades').select('*').eq('id', tradeId).eq('user_id', user.id).single();
    if (tradeErr || !trade) { __log(404, 'Trade not found'); return json({ error: 'Trade not found' }, 404); }
    if (trade.status !== 'open') {
      // Idempotent: if the caller polls after a previous sync already closed
      // the trade, return the already-closed state instead of erroring.
      return json({ success: true, alreadyClosed: true, trade });
    }

    // --- LOAD PROFILE ---
    const { data: profile, error: profErr } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (profErr || !profile || !profile.exchange || !profile.api_key_encrypted || !profile.api_secret_encrypted) { __log(400, 'Exchange not connected'); return json({ error: 'Exchange not connected' }, 400); }

    let apiKey: string, apiSecret: string;
    try { apiKey = await decryptSecret(profile.api_key_encrypted); apiSecret = await decryptSecret(profile.api_secret_encrypted); }
    catch (_) { __log(500, 'Decrypt failed'); return json({ error: 'Decrypt failed' }, 500); }

    const { data: cfg } = await supabase.from('app_config').select('key, value');
    const conf: Record<string, any> = {};
    if (cfg) for (const r of cfg) conf[r.key] = r.value;
    const tradingRules = conf.trading_rules;
    const lockConfig = conf.lock_config;

    // --- INIT EXCHANGE ---
    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    const exchange = new ExchangeClass({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'swap' } });
    await exchange.loadMarkets();

    const swapSymbol = (trade.symbol || '').includes(':') ? trade.symbol : `${trade.symbol}:USDT`;
    const mkt = (exchange as any).markets?.[swapSymbol];
    const marketSymbol = mkt?.id ?? trade.symbol;

    // --- CHECK POSITION STATUS AT EXCHANGE ---
    // If a non-zero contract count is still open for this symbol, the trade
    // is still live — return early. Otherwise it was closed by SL/TP and
    // we need to find which one and record the fill.
    let stillOpen = false;
    try {
      const positions = await exchange.fetchPositions([swapSymbol]);
      stillOpen = positions.some((p: any) => (p?.symbol === swapSymbol || p?.info?.contract === marketSymbol) && Number(p?.contracts || p?.contractSize || 0) > 0);
    } catch (_) {
      // If we can't fetch positions we bail out safely — assume still open,
      // so we don't accidentally mark a real position as closed.
      __log(503, 'fetchPositions failed');
      return json({ success: true, stillOpen: true, note: 'fetchPositions failed, assuming still open' });
    }

    if (stillOpen) {
      return json({ success: true, stillOpen: true });
    }

    // --- POSITION IS CLOSED AT EXCHANGE — FIND EXIT PRICE ---
    // Prefer the actual fill from whichever SL/TP order changed to 'closed'
    // or 'filled'. Fall back to fetching the order history for the symbol.
    let exitPrice = 0;
    let firedSide: 'sl' | 'tp' | 'manual' = 'manual';

    const tryFetchOrder = async (id: string | null | undefined) => {
      if (!id) return null;
      try {
        const o = await exchange.fetchOrder(id, marketSymbol);
        return o;
      } catch (_) { return null; }
    };

    const slOrder = await tryFetchOrder(trade.exchange_sl_order_id);
    const tpOrder = await tryFetchOrder(trade.exchange_tp_order_id);

    const isFilled = (o: any) => {
      if (!o) return false;
      const status = String(o.status || o.info?.status || '').toLowerCase();
      const filled = Number(o.filled || o.info?.filled_total || o.info?.fill_price || 0);
      return status === 'closed' || status === 'filled' || status === 'finished' || filled > 0;
    };

    if (isFilled(slOrder)) {
      firedSide = 'sl';
      exitPrice = Number(slOrder.average ?? slOrder.price ?? trade.stop_loss) || Number(trade.stop_loss);
    } else if (isFilled(tpOrder)) {
      firedSide = 'tp';
      exitPrice = Number(tpOrder.average ?? tpOrder.price ?? trade.take_profit) || Number(trade.take_profit);
    } else {
      // Neither trigger order shows a fill — position may have been closed
      // manually on the exchange side. Use the current ticker as a best-effort
      // exit price so P&L isn't zero.
      try {
        const ticker = await exchange.fetchTicker(marketSymbol);
        exitPrice = Number(ticker?.last ?? ticker?.close ?? 0);
      } catch (_) {}
      if (!exitPrice) exitPrice = Number(trade.entry_price);
    }

    // --- CANCEL LEFTOVER SL/TP ORDER (whichever didn't fill) ---
    // Gate.io price_orders live on a separate endpoint — see close-trade
    // for the same pattern.
    const cancelGateioPriceOrder = async (orderId: string) => {
      const signed = (exchange as any).sign(
        `usdt/price_orders/${orderId}`,
        ['private', 'futures'],
        'DELETE',
        {},
      );
      await fetch(signed.url, { method: 'DELETE', headers: signed.headers });
    };
    const cancelOne = async (id: string | null | undefined) => {
      if (!id) return;
      try {
        if (profile.exchange === 'gateio') await cancelGateioPriceOrder(id);
        else await exchange.cancelOrder(id, marketSymbol);
      } catch (_) {}
    };
    if (firedSide === 'sl') await cancelOne(trade.exchange_tp_order_id);
    else if (firedSide === 'tp') await cancelOne(trade.exchange_sl_order_id);
    else { await cancelOne(trade.exchange_sl_order_id); await cancelOne(trade.exchange_tp_order_id); }

    // --- COMPUTE P&L (mirrors close-trade for consistency) ---
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
    const noteSuffix = firedSide === 'sl' ? 'SL fired at exchange' : firedSide === 'tp' ? 'TP fired at exchange' : 'Closed at exchange (unknown trigger)';
    const { data: updatedTrade } = await supabase.from('trades').update({
      status: 'closed',
      exit_price: exitPrice,
      pnl_usdt: Math.round(pnlUsdt * 100) / 100,
      pnl_r: Math.round(pnlR * 100) / 100,
      closed_at: new Date().toISOString(),
      notes: [trade.notes, noteSuffix].filter(Boolean).join(' | '),
    }).eq('id', tradeId).select().single();

    // --- UPDATE DAILY STATS ---
    const today = new Date().toISOString().split('T')[0];
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

    // --- LOCK CHECKS (same rules as close-trade) ---
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

    // --- SNAPSHOT ---
    const { data: snaps } = await supabase.from('equity_snapshots').select('*').eq('user_id', user.id).order('snapshot_at', { ascending: false }).limit(1);
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

    __log(200, undefined, { success: true, tradeId, symbol: trade.symbol, firedSide, exitPrice, pnl: Math.round(pnlUsdt * 100) / 100 });
    return json({
      success: true,
      stillOpen: false,
      firedSide,
      trade: updatedTrade,
      pnl: { usdt: Math.round(pnlUsdt * 100) / 100, r: Math.round(pnlR * 100) / 100, isWin },
      lockTriggered,
      dailyStats: { consecutiveLosses: newConsecutiveLosses, dailyLossR: Math.round(newDailyLossR * 100) / 100 },
    });

  } catch (error: any) {
    const msg = (typeof error?.message === 'string' ? error.message : 'unknown').slice(0, 500);
    console.error(`sync-trade [${__reqId}]`, msg);
    try {
      const cl = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      await cl.from('audit_logs').insert({ action: 'close_trade', function_name: 'sync-trade', response_status: 500, error_message: msg + ' [' + __reqId + ']', created_at: new Date().toISOString() });
    } catch (_) {}
    return json({ success: false, error: msg }, 500);
  }
});
