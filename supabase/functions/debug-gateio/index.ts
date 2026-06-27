/**
 * DEBUG: Test all Gate.io SL/TP parameter combos against the real API.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: profile } = await supabase.from('profiles').select('*').eq('email', 'ezraricad2@gmail.com').single();
    if (!profile?.exchange) return new Response(JSON.stringify({ error: 'No exchange' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = await decryptSecret(profile.api_key_encrypted);
    const apiSecret = await decryptSecret(profile.api_secret_encrypted);

    const gate = new (ccxt as any).gate({ apiKey, secret: apiSecret, options: { defaultType: 'swap' } });
    await gate.loadMarkets();

    const symbol = 'SPCX/USDT:USDT';
    const qty = 1;
    const results: any[] = [];
    const stopLoss = 142;  // above current price for SHORT
    const takeProfit = 138; // below current price for SHORT

    // Test 1: createStopLossOrder(symbol, amount, stopLossPrice, params)
    try {
      const o = await gate.createStopLossOrder(symbol, qty, stopLoss, { reduceOnly: true });
      results.push({ test: 'createStopLossOrder(symbol,amount,stopLossPrice,{reduceOnly:true})', ok: true, id: o?.id, info: o?.info });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createStopLossOrder(symbol,amount,stopLossPrice,{reduceOnly:true})', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 2: createOrder type='stop', with price=stopLoss as 5th arg
    try {
      const o = await gate.createOrder(symbol, 'stop', 'buy', qty, stopLoss, { reduceOnly: true });
      results.push({ test: "createOrder(symbol,'stop','buy',qty,stopLoss,{reduceOnly:true})", ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: "createOrder(symbol,'stop','buy',qty,stopLoss,{reduceOnly:true})", ok: false, msg: e.message.slice(0, 200) }); }

    // Test 3: createOrder type='market' + params.stopPrice
    try {
      const o = await gate.createOrder(symbol, 'market', 'buy', qty, undefined, { stopPrice: stopLoss, reduceOnly: true });
      results.push({ test: "createOrder(symbol,'market','buy',qty,undefined,{stopPrice,reduceOnly:true})", ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: "createOrder(symbol,'market','buy',qty,undefined,{stopPrice,reduceOnly:true})", ok: false, msg: e.message.slice(0, 200) }); }

    // Test 4: createTakeProfitOrder(symbol, amount, takeProfitPrice, params)
    try {
      const o = await gate.createTakeProfitOrder(symbol, qty, takeProfit, { reduceOnly: true });
      results.push({ test: 'createTakeProfitOrder(symbol,amount,takeProfitPrice,{reduceOnly:true})', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createTakeProfitOrder(symbol,amount,takeProfitPrice,{reduceOnly:true})', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 5: createOrder limit + reduceOnly for TP
    try {
      const o = await gate.createOrder(symbol, 'limit', 'buy', qty, takeProfit, { reduceOnly: true });
      results.push({ test: "createOrder(symbol,'limit','buy',qty,takeProfit,{reduceOnly:true})", ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: "createOrder(symbol,'limit','buy',qty,takeProfit,{reduceOnly:true})", ok: false, msg: e.message.slice(0, 200) }); }

    // Test 6: Check open orders to see what stuck
    const openOrders = await gate.fetchOpenOrders(symbol);
    results.push({ test: 'fetchOpenOrders', count: openOrders.length });

    return new Response(JSON.stringify({ ok: true, results }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch(e: any) { return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
});
