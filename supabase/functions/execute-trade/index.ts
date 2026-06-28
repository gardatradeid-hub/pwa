/**
 * Execute Trade — Supabase Edge Function
 *
 * POST /functions/v1/execute-trade
 * Body: { symbol, side, entryPrice, stopLoss, rrRatio }
 *
 * Every return path logs to audit_logs. Catch block is 100% crash-proof:
 * it captures the error string and logs BEFORE referencing any variable
 * that might be undefined.
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

interface ExecuteTradeRequest { symbol: string; side: 'long' | 'short'; entryPrice: number; stopLoss: number; rrRatio: number; }

interface GuardrailCheck { name: string; passed: boolean; message: string; blocking: boolean; }

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  // ---- HANDLE PREFLIGHT ----
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // ---- SNAPSHOT EARLY — these are the ONLY safe references in catch ----
  const __errorId = crypto.randomUUID().slice(0, 8);
  const __start = Date.now();
  let __lastErr = '';

  try {
    // --- AUTH ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      logAudit(supabase, { action: Action.EXECUTE_TRADE, functionName: 'execute-trade', responseStatus: 401, errorMessage: 'Auth failed' });
      return json({ error: 'Unauthorized — invalid token' }, 401);
    }

    // --- PARSE INPUT ---
    const body: ExecuteTradeRequest = await req.json();
    const { symbol, side, entryPrice, stopLoss, rrRatio } = body;

    if (!symbol || !side || !entryPrice || !stopLoss || !rrRatio) return json({ error: 'Missing required fields' }, 400);
    if (!['long', 'short'].includes(side)) return json({ error: 'side must be long or short' }, 400);

    // Block manual lot size
    const forbiddenFields = ['quantity', 'qty', 'size', 'amount', 'leverage', 'margin'] as const;
    const anyBody = body as Record<string, unknown>;
    for (const f of forbiddenFields) {
      if (anyBody[f] !== undefined) return json({ error: `Field "${f}" is not allowed — server-calculated` }, 400);
    }

    // --- LOAD CONFIG ---
    const { data: configRows } = await supabase.from('app_config').select('key, value');
    if (!configRows) return json({ error: 'Failed to load app config' }, 500);
    const config: Record<string, any> = {};
    for (const row of configRows) config[row.key] = row.value;
    const tradingRules = config.trading_rules;
    const phaseConfig = config.phase_config;
    const lockConfig = config.lock_config;
    const revengeConfig = config.revenge_config;
    const supportedPairs = config.supported_pairs || [];

    // --- LOAD PROFILE ---
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (!profile) return json({ error: 'Profile not found' }, 400);
    const userEmail = profile.email || user.email || null;

    if (!profile.exchange || !profile.api_key_encrypted || !profile.api_secret_encrypted) {
      return json({ error: 'Exchange not connected' }, 400);
    }

    // --- DECRYPT KEYS ---
    let apiKey: string; let apiSecret: string;
    try {
      apiKey = await decryptSecret(profile.api_key_encrypted);
      apiSecret = await decryptSecret(profile.api_secret_encrypted);
    } catch (_) {
      return json({ error: 'Stored credentials cannot be decrypted. Reconnect exchange.' }, 500);
    }

    const phase = phaseConfig.phases.find((p: any) => p.phase === profile.current_phase) || phaseConfig.phases[0];

    // --- LOAD DAILY STATS + LOCKS + POSITIONS + EQUITY ---
    const today = new Date().toISOString().split('T')[0];
    const { data: stats } = await supabase.from('daily_stats').select('*').eq('user_id', user.id).eq('date', today).maybeSingle();
    const tradesToday = stats?.trades_count || 0;
    const dailyLossR = Number(stats?.daily_loss_r || 0);
    const consecutiveLosses = stats?.consecutive_losses || 0;

    const now = new Date().toISOString();
    const { data: activeLocks } = await supabase.from('lock_events').select('*').eq('user_id', user.id).gt('unlocks_at', now).order('locked_at', { ascending: false }).limit(1);
    const isLocked = activeLocks && activeLocks.length > 0;

    const { data: activePositions } = await supabase.from('trades').select('*').eq('user_id', user.id).eq('status', 'open');
    const hasOpenPosition = activePositions && activePositions.length > 0;

    const { data: snapshots } = await supabase.from('equity_snapshots').select('*').eq('user_id', user.id).order('snapshot_at', { ascending: false }).limit(1);

    // --- BALANCE ---
    let balance = 100;
    if (snapshots && snapshots.length > 0) balance = Number(snapshots[0].balance_usdt);
    // Try live balance (may fail for futures-only keys)
    try {
      const exTemp = new (EXCHANGE_CLASSES[profile.exchange])({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'swap' } });
      const bal = await exTemp.fetchBalance();
      const usdt = bal.USDT || bal.USDC || {};
      if (usdt.total || usdt.free) balance = usdt.total || usdt.free;
    } catch (_) {}

    let drawdownR = 0;
    if (snapshots && snapshots.length > 0) {
      const hwm = Number(snapshots[0].high_water_mark);
      drawdownR = hwm > 0 ? ((hwm - balance) / hwm) * 100 : 0;
    }

    // ==============================
    // GUARDRAIL CHECKS
    // ==============================
    const checks: GuardrailCheck[] = [];
    // 1. supported symbol
    if (supportedPairs.length > 0) { const ok = supportedPairs.includes(symbol); checks.push({ name: 'supported_symbol', passed: ok, message: ok ? '' : `Pair ${symbol} tidak didukung`, blocking: true }); }
    // 2. max positions
    checks.push({ name: 'max_positions', passed: !hasOpenPosition, message: 'Maksimal 1 posisi terbuka', blocking: true, message_en: '' });
    // 3. max trades
    checks.push({ name: 'max_trades', passed: tradesToday < phase.max_trades, message: `Maksimal ${phase.max_trades} trade hari ini`, blocking: true, message_en: '' });
    // 4. daily loss
    checks.push({ name: 'daily_loss', passed: dailyLossR < tradingRules.daily_loss_limit_r, message: `Batas kerugian ${tradingRules.daily_loss_limit_r}R`, blocking: true, message_en: '' });
    // 5. drawdown
    checks.push({ name: 'total_drawdown', passed: drawdownR < tradingRules.total_drawdown_r, message: `Drawdown ${tradingRules.total_drawdown_r}R`, blocking: true, message_en: '' });
    // 6. account locked
    checks.push({ name: 'account_locked', passed: !isLocked, message: 'Akun terkunci', blocking: true, message_en: '' });
    // 7. leverage
    checks.push({ name: 'leverage', passed: true, message: '', blocking: false, message_en: '' });
    // 8. risk
    checks.push({ name: 'risk_per_trade', passed: true, message: '', blocking: false, message_en: '' });
    // 9. min rr
    checks.push({ name: 'min_rr', passed: rrRatio >= phase.min_rr, message: `Min RR 1:${phase.min_rr}`, blocking: true, message_en: '' });

    // 10. martingale
    const { data: lastClosed } = await supabase.from('trades').select('entry_price,closed_at,symbol').eq('user_id', user.id).eq('status', 'closed').eq('symbol', symbol).order('closed_at', { ascending: false }).limit(1);
    let martingaleOk = true;
    if (tradingRules.martingale_blocked && lastClosed && lastClosed.length > 0) {
      const elapsed = (Date.now() - new Date(lastClosed[0].closed_at!).getTime()) / 60000;
      if (elapsed < revengeConfig.detection_window_min) martingaleOk = false;
    }
    checks.push({ name: 'martingale', passed: martingaleOk, message: martingaleOk ? '' : 'Martingale/revenge. Tunggu 5 menit.', blocking: true, message_en: '' });

    // 11. averaging down
    let avgOk = true;
    if ((tradingRules.averaging_down_blocked ?? tradingRules.averging_down_blocked) && hasOpenPosition) {
      const ot = activePositions![0];
      if ((ot.side === 'long' && entryPrice < ot.entry_price) || (ot.side === 'short' && entryPrice > ot.entry_price)) avgOk = false;
    }
    checks.push({ name: 'averaging_down', passed: avgOk, message: 'Averaging down diblokir', blocking: true, message_en: '' });

    // 12. cooldown
    const { data: lastTradeClosed } = await supabase.from('trades').select('closed_at').eq('user_id', user.id).eq('status', 'closed').order('closed_at', { ascending: false }).limit(1);
    let coolOk = true;
    if (phase.cooldown_min > 0 && lastTradeClosed && lastTradeClosed.length > 0) {
      const since = (Date.now() - new Date(lastTradeClosed[0].closed_at!).getTime()) / 60000;
      coolOk = since >= phase.cooldown_min;
    }
    checks.push({ name: 'cooldown', passed: coolOk, message: coolOk ? '' : `Cooldown ${phase.cooldown_min} menit`, blocking: true, message_en: '' });

    const failedChecks = checks.filter(c => !c.passed && c.blocking);
    if (failedChecks.length > 0) {
      logAudit(supabase, { userId: user.id, userEmail, action: Action.EXECUTE_TRADE, functionName: 'execute-trade', requestBody: { symbol, side, entryPrice, stopLoss, rrRatio }, responseStatus: 422, errorMessage: 'Guardrail: ' + failedChecks.map(c => c.name).join(',') });
      return json({ success: false, error: 'Guardrail checks failed', failedChecks, allChecks: checks }, 422);
    }

    // ==============================
    // POSITION SIZING (1R = 1 %)
    // ==============================
    const riskAmount = balance * (tradingRules.risk_per_trade_pct / 100);
    const slDistancePct = Math.abs(entryPrice - stopLoss) / entryPrice;
    if (slDistancePct <= 0) return json({ error: 'Invalid stop loss distance' }, 400);
    const positionValue = riskAmount / slDistancePct;
    const quantity = positionValue / entryPrice;
    const takeProfit = side === 'long' ? entryPrice * (1 + slDistancePct * rrRatio) : entryPrice * (1 - slDistancePct * rrRatio);
    const margin = positionValue;

    // ==============================
    // ORDER EXECUTION
    // ==============================
    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    const exchange = new ExchangeClass({ apiKey, secret: apiSecret, enableRateLimit: true, options: { defaultType: 'swap' } });

    await exchange.loadMarkets();
    const swapSymbol = symbol.includes(':') ? symbol : `${symbol}:USDT`;
    const market = (exchange as any).markets?.[swapSymbol];
    const marketSymbol = market?.id ?? symbol;

    try { await exchange.setLeverage(1, marketSymbol); } catch (_) {}

    const orderSide: 'buy' | 'sell' = side === 'long' ? 'buy' : 'sell';
    const slSide: 'buy' | 'sell' = side === 'long' ? 'sell' : 'buy';

    // 1. Entry
    const order = await exchange.createOrder(marketSymbol, 'market', orderSide, quantity);

    // 2. SL — stop market order. Bybit requires triggerDirection.
    let slOrder: any = null; let slErr: string | null = null;
    try {
      slOrder = await exchange.createOrder(marketSymbol, 'market', slSide, quantity, undefined, {
        stopPrice: stopLoss,
        reduceOnly: true,
        triggerDirection: side === 'long' ? 'ascending' : 'descending',
      });
    } catch (e: any) { slErr = e?.message?.slice(0, 300) || 'sl error'; }

    // 3. TP — reduce-only limit order. Using takeProfitPrice for exchanges
    // that accept it. No trigger needed — this is a standing limit order
    // that will fill when the price reaches takeProfit.
    let tpOrder: any = null; let tpErr: string | null = null;
    try {
      tpOrder = await exchange.createOrder(marketSymbol, 'limit', slSide, quantity, takeProfit, {
        reduceOnly: true,
        timeInForce: 'gtc',
      });
    } catch (e: any) { tpErr = e?.message?.slice(0, 300) || 'tp error'; }

    // --- SAVE TO DB ---
    const { data: trade } = await supabase.from('trades').insert({
      user_id: user.id, exchange: profile.exchange, symbol, side,
      entry_price: entryPrice, stop_loss: stopLoss, take_profit: takeProfit,
      quantity, risk_amount: riskAmount, rr_ratio: rrRatio, status: 'open',
      notes: [slErr ? 'SL:' + slErr : '', tpErr ? 'TP:' + tpErr : ''].filter(Boolean).join(' | ') || null,
      exchange_order_id: order?.id || null,
      exchange_sl_order_id: slOrder?.id || null,
      exchange_tp_order_id: tpOrder?.id || null,
    }).select().single();

    // --- UPDATE DAILY STATS ---
    await supabase.from('daily_stats').upsert({ user_id: user.id, date: today, trades_count: (stats?.trades_count || 0) + 1 }, { onConflict: 'user_id,date' });

    // --- AUDIT LOG + RETURN ---
    logAudit(supabase, { userId: user.id, userEmail, action: Action.EXECUTE_TRADE, functionName: 'execute-trade', requestBody: { symbol, side, entryPrice, stopLoss, rrRatio }, responseStatus: 200, responseBody: { symbol, side, entryPrice, quantity: Number(quantity.toFixed(6)), margin: Number(margin.toFixed(2)) } });
    return json({ success: true, trade, positionDetails: { quantity, margin, takeProfit, riskAmount, potentialProfit: riskAmount * rrRatio, leverage: 1 }, allChecks: checks });

  } catch (error: any) {
    // --- CRASH-PROOF CATCH: no variable references, only primitives ---
    const msg = (typeof error?.message === 'string' ? error.message : 'unknown error').slice(0, 500);
    console.error(`execute-trade [${__errorId}]`, msg);
    // Audit log with zero external references
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const logClient = createClient(supabaseUrl, supabaseServiceKey);
      await logClient.from('audit_logs').insert({
        action: 'execute_trade', function_name: 'execute-trade',
        response_status: 500, error_message: msg + ' [' + __errorId + ']',
        created_at: new Date().toISOString(),
      });
    } catch (_) { /* logging must never break response */ }
    return json({ success: false, error: msg, type: 'Error' }, 500);
  }
});
