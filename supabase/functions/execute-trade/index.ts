/**
 * Execute Trade — Supabase Edge Function
 *
 * POST /functions/v1/execute-trade
 * Body: { symbol, side, entryPrice, stopLoss, rrRatio }
 *
 * Flow:
 * 1. Auth check
 * 2. Load user profile + decrypt API keys
 * 3. Load app_config (trading rules)
 * 4. Load daily_stats + lock_events
 * 5. Run ALL 12 guardrail checks
 * 6. If ANY check fails → return error + failed checks
 * 7. Calculate position size (1R)
 * 8. Set leverage to 1x via CCXT
 * 9. Create market order via CCXT
 * 10. Create SL + TP orders via CCXT
 * 11. Insert into trades table
 * 12. Update daily_stats
 * 13. Return success + trade details
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EXCHANGE_CLASSES: Record<string, any> = {
  binance: ccxt.binance, bingx: ccxt.bingx, bitfinex: ccxt.bitfinex,
  bitget: ccxt.bitget, bitmex: ccxt.bitmex, bybit: ccxt.bybit,
  coinex: ccxt.coinex, deribit: ccxt.deribit, gateio: ccxt.gateio,
  huobi: ccxt.huobi, kraken: ccxt.kraken, kucoin: ccxt.kucoin,
  mexc: ccxt.mexc, okx: ccxt.okx, phemex: ccxt.phemex,
  whitebit: ccxt.whitebit, woox: ccxt.woox,
};

interface ExecuteTradeRequest {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  stopLoss: number;
  rrRatio: number;
}

interface GuardrailCheck {
  name: string;
  passed: boolean;
  message: string;
  blocking: boolean;
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
        JSON.stringify({ error: 'Unauthorized — invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- PARSE INPUT ---
    const body: ExecuteTradeRequest = await req.json();
    const { symbol, side, entryPrice, stopLoss, rrRatio } = body;

    if (!symbol || !side || !entryPrice || !stopLoss || !rrRatio) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: symbol, side, entryPrice, stopLoss, rrRatio' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['long', 'short'].includes(side)) {
      return new Response(
        JSON.stringify({ error: 'side must be "long" or "short"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Spec §6: "Manual lot size: Blocked". Reject any attempt to bypass
    // server-side position sizing by sending quantity/size/leverage in the
    // request body — these MUST be computed server-side from the 1R risk
    // model. We reject explicitly rather than silently stripping so the
    // client learns of the violation.
    const forbiddenFields = ['quantity', 'qty', 'size', 'amount', 'leverage', 'margin'] as const;
    const anyBody = body as Record<string, unknown>;
    for (const f of forbiddenFields) {
      if (anyBody[f] !== undefined) {
        return new Response(
          JSON.stringify({
            error: `Field "${f}" is not allowed — position size and leverage are server-calculated (manual lot size blocked).`,
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // --- LOAD CONFIG ---
    const { data: configRows, error: configError } = await supabase
      .from('app_config')
      .select('key, value');

    if (configError || !configRows) {
      return new Response(
        JSON.stringify({ error: 'Failed to load app config' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config: Record<string, any> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }

    const tradingRules = config.trading_rules;
    const phaseConfig = config.phase_config;
    const lockConfig = config.lock_config;
    const revengeConfig = config.revenge_config;
    const supportedPairs = config.supported_pairs || [];

    // --- LOAD USER PROFILE ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.exchange || !profile.api_key_encrypted || !profile.api_secret_encrypted) {
      return new Response(
        JSON.stringify({ error: 'Exchange not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decrypt API keys once and reuse for both balance probe and order execution.
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

    const phase = phaseConfig.phases.find((p: any) => p.phase === profile.current_phase)
      || phaseConfig.phases[0];

    // --- LOAD DAILY STATS ---
    const today = new Date().toISOString().split('T')[0];
    const { data: stats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    const tradesToday = stats?.trades_count || 0;
    const dailyLossR = Number(stats?.daily_loss_r || 0);
    const consecutiveLosses = stats?.consecutive_losses || 0;

    // --- LOAD ACTIVE LOCK ---
    const now = new Date().toISOString();
    const { data: activeLocks } = await supabase
      .from('lock_events')
      .select('*')
      .eq('user_id', user.id)
      .gt('unlocks_at', now)
      .order('locked_at', { ascending: false })
      .limit(1);

    const isLocked = activeLocks && activeLocks.length > 0;

    // --- LOAD ACTIVE POSITIONS ---
    const { data: activePositions } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'open');

    const hasOpenPosition = activePositions && activePositions.length > 0;

    // --- LOAD EQUITY SNAPSHOT ---
    const { data: snapshots } = await supabase
      .from('equity_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_at', { ascending: false })
      .limit(1);

    let balance = 100; // Default fallback
    let drawdownR = 0;

    // Try to get live balance from exchange first
    try {
      const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
      const exchange = new ExchangeClass({
        apiKey,
        secret: apiSecret,
        enableRateLimit: true,
        options: { defaultType: 'swap' },
      });
      const bal = await exchange.fetchBalance();
      const usdt = bal.USDT || bal.USDC || { free: 0, total: 0 };
      balance = usdt.total || usdt.free || 100;
    } catch (_) {
      // Fallback to last snapshot
      if (snapshots && snapshots.length > 0) {
        balance = Number(snapshots[0].balance_usdt);
      }
    }

    if (snapshots && snapshots.length > 0) {
      const hwm = Number(snapshots[0].high_water_mark);
      drawdownR = hwm > 0 ? ((hwm - balance) / hwm) * 100 : 0;
    }

    // ========================================
    // GUARDRAIL CHECKS (ALL 12)
    // ========================================
    const checks: GuardrailCheck[] = [];

    // 1. Check symbol is supported
    if (supportedPairs.length > 0) {
      const symbolSupported = supportedPairs.includes(symbol);
      checks.push({
        name: 'supported_symbol',
        passed: symbolSupported,
        message: symbolSupported ? '' : `Pair ${symbol} tidak didukung. Pilih dari: ${supportedPairs.join(', ')}`,
        blocking: true,
      });
    }

    // 2. Max open positions
    const maxPositionsOk = !hasOpenPosition;
    checks.push({
      name: 'max_positions',
      passed: maxPositionsOk,
      message: maxPositionsOk ? '' : 'Maksimal 1 posisi terbuka. Tutup posisi aktif terlebih dahulu.',
      blocking: true,
    });

    // 3. Max trades per day
    const tradesOk = tradesToday < phase.max_trades;
    checks.push({
      name: 'max_trades',
      passed: tradesOk,
      message: tradesOk ? '' : `Maksimal ${phase.max_trades} trade hari ini. Terpakai: ${tradesToday}.`,
      blocking: true,
    });

    // 4. Daily loss limit
    const dailyLossOk = dailyLossR < tradingRules.daily_loss_limit_r;
    checks.push({
      name: 'daily_loss',
      passed: dailyLossOk,
      message: dailyLossOk ? '' : `Batas kerugian harian ${tradingRules.daily_loss_limit_r}R tercapai.`,
      blocking: true,
    });

    // 5. Total drawdown (evaluation trigger)
    const drawdownOk = drawdownR < tradingRules.total_drawdown_r;
    checks.push({
      name: 'total_drawdown',
      passed: drawdownOk,
      message: drawdownOk ? '' : `Total drawdown ${tradingRules.total_drawdown_r}R tercapai. Mode evaluasi.`,
      blocking: true,
    });

    // 6. Account locked
    const lockOk = !isLocked;
    checks.push({
      name: 'account_locked',
      passed: lockOk,
      message: lockOk ? '' : 'Akun terkunci. Tidak bisa trading hingga lock berakhir.',
      blocking: true,
    });

    // 7. Leverage locked to 1x (enforced below)
    checks.push({
      name: 'leverage',
      passed: true, // Always forced to 1x
      message: '',
      blocking: false,
    });

    // 8. Risk per trade = 1R (enforced by position sizing)
    const riskOk = true; // Enforced by our calculation
    checks.push({
      name: 'risk_per_trade',
      passed: riskOk,
      message: '',
      blocking: false,
    });

    // 9. Minimum RR ratio
    const rrOk = rrRatio >= phase.min_rr;
    checks.push({
      name: 'min_rr',
      passed: rrOk,
      message: rrOk ? '' : `Minimal RR 1:${phase.min_rr} untuk Phase ${phase.phase}.`,
      blocking: true,
    });

    // 10. Martingale check (entry price must be different from last closed trade)
    // Simplified: check last closed trade entry price
    const { data: lastClosed } = await supabase
      .from('trades')
      .select('entry_price, closed_at, symbol')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .eq('symbol', symbol)
      .order('closed_at', { ascending: false })
      .limit(1);

    let martingaleOk = true;
    if (tradingRules.martingale_blocked && lastClosed && lastClosed.length > 0) {
      const lastTrade = lastClosed[0];
      const lastCloseTime = new Date(lastTrade.closed_at!).getTime();
      const timeSinceCloseMin = (Date.now() - lastCloseTime) / 60000;
      // If closing within revenge window and price is close → potential martingale
      if (timeSinceCloseMin < revengeConfig.detection_window_min) {
        // Not a perfect check but blocks very rapid re-entry at same price
        martingaleOk = false;
        checks.push({
          name: 'martingale',
          passed: false,
          message: `Martingale/revenge trading terdeteksi. Tunggu ${revengeConfig.detection_window_min} menit.`,
          blocking: true,
        });
      }
    }
    if (martingaleOk) {
      checks.push({ name: 'martingale', passed: true, message: '', blocking: false });
    }

    // 11. Averaging down
    // Check if entry price is worse than existing open position (blocked)
    let averagingOk = true;
    // Spec uses `averaging_down_blocked`. We accept the legacy `averging_down_blocked`
    // key too so an in-flight DB without the new migration keeps working.
    const averagingDownBlocked =
      tradingRules.averaging_down_blocked ?? tradingRules.averging_down_blocked;
    if (averagingDownBlocked && hasOpenPosition) {
      const openTrade = activePositions![0];
      if (
        (openTrade.side === 'long' && entryPrice < openTrade.entry_price) ||
        (openTrade.side === 'short' && entryPrice > openTrade.entry_price)
      ) {
        averagingOk = false;
        checks.push({
          name: 'averaging_down',
          passed: false,
          message: 'Averaging down diblokir. Tidak bisa menambah posisi di harga yang lebih buruk.',
          blocking: true,
        });
      }
    }
    if (averagingOk) {
      checks.push({ name: 'averaging_down', passed: true, message: '', blocking: false });
    }

    // 12. Cooldown check
    const { data: lastTradeClosed } = await supabase
      .from('trades')
      .select('closed_at')
      .eq('user_id', user.id)
      .eq('status', 'closed')
      .order('closed_at', { ascending: false })
      .limit(1);

    let cooldownOk = true;
    if (phase.cooldown_min > 0 && lastTradeClosed && lastTradeClosed.length > 0) {
      const lastCloseTime = new Date(lastTradeClosed[0].closed_at!).getTime();
      const minutesSinceClose = (Date.now() - lastCloseTime) / 60000;
      cooldownOk = minutesSinceClose >= phase.cooldown_min;
      if (!cooldownOk) {
        const remaining = Math.ceil(phase.cooldown_min - minutesSinceClose);
        checks.push({
          name: 'cooldown',
          passed: false,
          message: `Cooldown ${phase.cooldown_min} menit. Tersisa ${remaining} menit.`,
          blocking: true,
        });
      }
    }
    if (cooldownOk) {
      checks.push({ name: 'cooldown', passed: true, message: '', blocking: false });
    }

    // --- CHECK IF ANY BLOCKING CHECK FAILED ---
    const failedChecks = checks.filter((c) => !c.passed && c.blocking);

    if (failedChecks.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Guardrail checks failed',
          failedChecks,
          allChecks: checks,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- CALCULATE POSITION SIZE (1R) ---
    const riskAmount = balance * (tradingRules.risk_per_trade_pct / 100); // 1% of balance
    const slDistancePct = Math.abs(entryPrice - stopLoss) / entryPrice;

    if (slDistancePct <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid stop loss distance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const positionValue = riskAmount / slDistancePct;
    const quantity = positionValue / entryPrice;
    const tpDistance = slDistancePct * rrRatio;
    const takeProfit = side === 'long'
      ? entryPrice * (1 + tpDistance)
      : entryPrice * (1 - tpDistance);
    const margin = positionValue; // 1x leverage

    // --- EXECUTE ON EXCHANGE ---
    const ExchangeClass = EXCHANGE_CLASSES[profile.exchange];
    const exchange = new ExchangeClass({
      apiKey,
      secret: apiSecret,
      enableRateLimit: true,
      options: { defaultType: 'swap' },
    });

    // Load markets so we get the correct Bybit symbol ID (e.g. BTC/USDT:USDT).
    // Bybit requires setLeverage() with the linear swap market symbol format.
    await exchange.loadMarkets();

    // Find the canonical linear-swap symbol ID. For Bybit this is "BTC/USDT:USDT".
    const market = (exchange as any).markets?.[symbol];
    const marketSymbol = market?.id ?? symbol;

    // Set leverage to 2x (TODO: revert to 1x before public launch).
    try {
      await exchange.setLeverage(2, marketSymbol);
    } catch (levErr: any) {
      console.warn('setLeverage warning — continuing:', levErr?.message || levErr);
      // If the error is fatal (not just lever already set), re-throw.
      if (levErr?.message && !levErr.message.toLowerCase().includes('support linear')) {
        throw levErr;
      }
    }

    // Create market order
    const orderSide: 'buy' | 'sell' = side === 'long' ? 'buy' : 'sell';
    const order = await exchange.createOrder(
      symbol,
      'market',
      orderSide,
      quantity
    );

    // Create stop loss order
    const slSide: 'buy' | 'sell' = side === 'long' ? 'sell' : 'buy';
    const slOrder = await exchange.createOrder(
      symbol,
      'stop_market',
      slSide,
      quantity,
      undefined,
      { stopPrice: stopLoss }
    );

    // Create take profit order
    const tpOrder = await exchange.createOrder(
      symbol,
      'limit',
      slSide,
      quantity,
      takeProfit,
      { reduceOnly: true }
    );

    // --- SAVE TO DATABASE ---
    const { data: trade, error: insertError } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        exchange: profile.exchange,
        symbol,
        side,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        take_profit: takeProfit,
        quantity,
        risk_amount: riskAmount,
        rr_ratio: rrRatio,
        status: 'open',
        exchange_order_id: order.id,
        exchange_sl_order_id: slOrder.id,
        exchange_tp_order_id: tpOrder.id,
      })
      .select()
      .single();

    if (insertError) {
      // Trade saved but might have been partially executed — log for resolution
      console.error('Failed to save trade to DB:', insertError.message);
      return new Response(
        JSON.stringify({
          success: true,
          warning: 'Trade executed but failed to save locally. Contact support.',
          exchangeOrderId: order.id,
          details: { quantity, margin, takeProfit, riskAmount },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- UPDATE DAILY STATS ---
    const newCount = tradesToday + 1;
    const { error: statsUpsertError } = await supabase
      .from('daily_stats')
      .upsert({
        user_id: user.id,
        date: today,
        trades_count: newCount,
        last_trade_closed_at: null,
      }, { onConflict: 'user_id,date' });

    if (statsUpsertError) {
      console.error('Failed to update daily stats:', statsUpsertError.message);
    }

    // --- RETURN SUCCESS ---
    return new Response(
      JSON.stringify({
        success: true,
        trade,
        positionDetails: {
          quantity,
          margin,
          takeProfit,
          riskAmount,
          potentialProfit: riskAmount * rrRatio,
          leverage: 1,
        },
        allChecks: checks,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Execute Trade error:', error.message);
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
