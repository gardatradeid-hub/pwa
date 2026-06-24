/**
 * Close Trade — Supabase Edge Function
 *
 * POST /functions/v1/close-trade
 * Body: { tradeId }
 *
 * Flow:
 * 1. Auth check
 * 2. Load trade from DB
 * 3. Close position via CCXT
 * 4. Cancel SL + TP orders
 * 5. Calculate P&L in USDT and R
 * 6. Update trade record (status, exit_price, pnl)
 * 7. Update daily_stats
 * 8. Check consecutive losses → trigger lock if needed
 * 9. Check daily loss limit → trigger lock if needed
 * 10. Check total drawdown → trigger evaluation if needed
 * 11. Snapshot equity
 * 12. Return result (triggers PostTradeLog modal on client)
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

interface CloseTradeRequest {
  tradeId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // --- AUTH ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- PARSE INPUT ---
    const { tradeId }: CloseTradeRequest = await req.json();
    if (!tradeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: tradeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- LOAD TRADE ---
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', tradeId)
      .eq('user_id', user.id)
      .single();

    if (tradeError || !trade) {
      return new Response(
        JSON.stringify({ error: 'Trade not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trade.status !== 'open') {
      return new Response(
        JSON.stringify({ error: 'Trade is already closed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- LOAD PROFILE ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || !profile.exchange || !profile.api_key_encrypted || !profile.api_secret_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Exchange not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt API keys (AES-256-GCM, see ../_shared/crypto.ts)
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

    // --- LOAD CONFIG ---
    const { data: configRows } = await supabase
      .from('app_config')
      .select('key, value');

    const config: Record<string, any> = {};
    if (configRows) {
      for (const row of configRows) {
        config[row.key] = row.value;
      }
    }

    const tradingRules = config.trading_rules;
    const lockConfig = config.lock_config;

    // --- INITIALIZE EXCHANGE ---
    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    const exchange = new ExchangeClass({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: { defaultType: 'swap' },
    });

    // --- CLOSE POSITION ---
    // Close with a market order. Gate.io requires a price param even for
    // market orders to calculate total cost. We pass takeProfit as
    // the reference price (it's a limit order to TP, so the price is
    // already in the trade).
    const closeSide: 'buy' | 'sell' = trade.side === 'long' ? 'sell' : 'buy';
    const closeOrder = await exchange.createOrder(
      trade.symbol,
      'market',
      closeSide,
      Number(trade.quantity),
      Number(trade.take_profit),
      { reduceOnly: true }
    );

    // Cancel SL + TP orders
    try {
      if (trade.exchange_sl_order_id) {
        await exchange.cancelOrder(trade.exchange_sl_order_id, trade.symbol);
      }
    } catch (_) { /* ignore — order might already be filled */ }
    try {
      if (trade.exchange_tp_order_id) {
        await exchange.cancelOrder(trade.exchange_tp_order_id, trade.symbol);
      }
    } catch (_) { /* ignore */ }

    // --- CALCULATE P&L ---
    const exitPrice = closeOrder.price || closeOrder.average || Number(trade.entry_price);
    let pnlUsdt: number;
    let pnlR: number;

    if (trade.side === 'long') {
      pnlUsdt = (exitPrice - Number(trade.entry_price)) * Number(trade.quantity);
      pnlR = (exitPrice - Number(trade.entry_price)) / (Number(trade.entry_price) - Number(trade.stop_loss));
    } else {
      pnlUsdt = (Number(trade.entry_price) - exitPrice) * Number(trade.quantity);
      pnlR = (Number(trade.entry_price) - exitPrice) / (Number(trade.stop_loss) - Number(trade.entry_price));
    }

    const isWin = pnlR > 0;

    // --- UPDATE TRADE ---
    const { data: updatedTrade } = await supabase
      .from('trades')
      .update({
        status: 'closed',
        exit_price: exitPrice,
        pnl_usdt: Math.round(pnlUsdt * 100) / 100,
        pnl_r: Math.round(pnlR * 100) / 100,
        closed_at: new Date().toISOString(),
      })
      .eq('id', tradeId)
      .select()
      .single();

    // --- UPDATE DAILY STATS ---
    const today = new Date().toISOString().split('T')[0];
    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const newLosses = (dailyStats?.losses || 0) + (isWin ? 0 : 1);
    const newWins = (dailyStats?.wins || 0) + (isWin ? 1 : 0);
    const newConsecutiveLosses = isWin ? 0 : (dailyStats?.consecutive_losses || 0) + 1;
    const newDailyLossR = Number(dailyStats?.daily_loss_r || 0) + (pnlR < 0 ? Math.abs(Number(pnlR)) : 0);
    const newPnlR = Number(dailyStats?.pnl_r || 0) + Number(pnlR);
    const newPnlUsdt = Number(dailyStats?.pnl_usdt || 0) + pnlUsdt;

    await supabase
      .from('daily_stats')
      .upsert({
        user_id: user.id,
        date: today,
        wins: newWins,
        losses: newLosses,
        pnl_r: Math.round(newPnlR * 100) / 100,
        pnl_usdt: Math.round(newPnlUsdt * 100) / 100,
        daily_loss_r: Math.round(newDailyLossR * 100) / 100,
        consecutive_losses: newConsecutiveLosses,
        last_trade_closed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });

    // --- CHECK LOCK CONDITIONS ---
    let lockTriggered: any = null;

    // Check 1: Consecutive losses
    if (newConsecutiveLosses >= lockConfig.consecutive_loss_trigger) {
      const { data: lockCounts } = await supabase
        .from('lock_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('locked_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const lockCountThisMonth = (lockCounts?.length || 0) + 1;
      let durationHours = lockConfig.flat_duration_hours;
      let triggerReview = false;

      // TIERED mode
      if (lockConfig.mode === 'TIERED' && lockConfig.tiered_schedule) {
        const tier = lockConfig.tiered_schedule.find((t: any) => t.count === lockCountThisMonth);
        if (tier) {
          durationHours = tier.duration_hours;
          triggerReview = tier.trigger_review || false;
        } else {
          // Use last tier
          const lastTier = lockConfig.tiered_schedule[lockConfig.tiered_schedule.length - 1];
          durationHours = lastTier.duration_hours;
          triggerReview = lastTier.trigger_review || false;
        }
      }

      const unlocksAt = new Date(Date.now() + durationHours * 3600 * 1000).toISOString();

      await supabase.from('lock_events').insert({
        user_id: user.id,
        lock_type: 'consecutive_loss',
        duration_hours: durationHours,
        lock_count_this_month: lockCountThisMonth,
        unlocks_at: unlocksAt,
      });

      lockTriggered = {
        type: 'consecutive_loss',
        durationHours,
        lockCountThisMonth,
        unlocksAt,
        triggerReview,
      };
    }

    // Check 2: Daily loss limit
    if (!lockTriggered && newDailyLossR >= tradingRules.daily_loss_limit_r) {
      const unlocksAt = new Date(Date.now() + 12 * 3600 * 1000).toISOString();

      await supabase.from('lock_events').insert({
        user_id: user.id,
        lock_type: 'daily_loss',
        duration_hours: 12,
        lock_count_this_month: 1,
        unlocks_at: unlocksAt,
      });

      lockTriggered = {
        type: 'daily_loss',
        durationHours: 12,
        lockCountThisMonth: 1,
        unlocksAt,
        triggerReview: false,
      };
    }

    // Check 3: Total drawdown → evaluation
    let evaluationTriggered = false;
    const { data: snapshots } = await supabase
      .from('equity_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_at', { ascending: false })
      .limit(1);

    if (snapshots && snapshots.length > 0) {
      const balance = Number(snapshots[0].balance_usdt);
      const hwm = Number(snapshots[0].high_water_mark);
      const drawdownR = hwm > 0 ? ((hwm - balance) / hwm) * 100 : 0;

      if (drawdownR >= tradingRules.total_drawdown_r) {
        evaluationTriggered = true;
        // Pause trading — reset phase to 1 after review
      }
    }

    // --- SNAPSHOT EQUITY ---
    try {
      const balance = await exchange.fetchBalance();
      const usdt = balance.USDT || balance.USDC || { total: 0 };

      // Get previous HWM
      let hwm = usdt.total;
      if (snapshots && snapshots.length > 0) {
        hwm = Math.max(usdt.total, Number(snapshots[0].high_water_mark));
      }

      const drawdownR_val = hwm > 0 ? ((hwm - usdt.total) / hwm) * 100 : 0;

      await supabase.from('equity_snapshots').insert({
        user_id: user.id,
        balance_usdt: usdt.total,
        high_water_mark: hwm,
        drawdown_r: Math.round(drawdownR_val * 100) / 100,
      });
    } catch (_) {
      // Non-critical if snapshot fails
    }

    // --- RETURN ---
    logAudit(supabase, {
      userId: user.id, action: Action.CLOSE_TRADE, functionName: 'close-trade', responseStatus: 200,
      responseBody: { tradeId: trade.id, symbol: trade.symbol, pnl: Math.round(pnlUsdt * 100) / 100 },
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        success: true,
        trade: updatedTrade,
        pnl: {
          usdt: Math.round(pnlUsdt * 100) / 100,
          r: Math.round(pnlR * 100) / 100,
          isWin,
        },
        lockTriggered,
        evaluationTriggered,
        dailyStats: {
          tradesToday: (dailyStats?.trades_count || 0) + 1,
          consecutiveLosses: newConsecutiveLosses,
          dailyLossR: Math.round(newDailyLossR * 100) / 100,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Close Trade error:', error.message);
    try {
      await logAudit(supabase, {
        userId: user?.id, action: Action.CLOSE_TRADE, functionName: 'close-trade', responseStatus: 500,
        errorMessage: error?.message || 'Unknown',
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
        type: error.constructor?.name || 'Error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
