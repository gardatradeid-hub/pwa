/**
 * DEBUG: Test Gate.io SL/TP parameter combinations.
 * Deploy, run once, read logs, then delete this function.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'ezraricad2@gmail.com')
      .single();

    if (!profile?.exchange) {
      return new Response(JSON.stringify({ error: 'No exchange connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const apiKey = await decryptSecret(profile.api_key_encrypted);
    const apiSecret = await decryptSecret(profile.api_secret_encrypted);

    const gate = new (ccxt as any).gate({
      apiKey, secret: apiSecret,
      options: { defaultType: 'swap' },
    });

    await gate.loadMarkets();
    const symbol = 'SPCX/USDT:USDT';
    const market = gate.markets[symbol];
    if (!market) return new Response(JSON.stringify({ error: 'Market not found', markets: Object.keys(gate.markets).filter((k: string) => k.includes('SPCX')) }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const results: any[] = [];
    const qty = 1;
    const slSide = 'buy'; // close short = buy
    const testSL = 140;
    const testTP = 137;

    // Test 1: createStopLossOrder
    try {
      const o = await gate.createStopLossOrder(symbol, qty, testSL, { reduceOnly: true });
      results.push({ test: 'createStopLossOrder', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createStopLossOrder', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 2: createOrder market + stopPrice
    try {
      const o = await gate.createOrder(symbol, 'market', slSide, qty, undefined, { stopPrice: testSL, reduceOnly: true });
      results.push({ test: 'createOrder market+stopPrice', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createOrder market+stopPrice', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 3: createOrder market + triggerPrice
    try {
      const o = await gate.createOrder(symbol, 'market', slSide, qty, undefined, { triggerPrice: testSL, reduceOnly: true });
      results.push({ test: 'createOrder market+triggerPrice', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createOrder market+triggerPrice', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 4: createTakeProfitOrder
    try {
      const o = await gate.createTakeProfitOrder(symbol, qty, testTP, { reduceOnly: true });
      results.push({ test: 'createTakeProfitOrder', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createTakeProfitOrder', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 5: createOrder limit + reduceOnly for TP
    try {
      const o = await gate.createOrder(symbol, 'limit', slSide, qty, testTP, { reduceOnly: true });
      results.push({ test: 'createOrder limit+reduceOnly TP', ok: true, id: o?.id });
      if (o?.id) await gate.cancelOrder(o.id, symbol);
    } catch(e: any) { results.push({ test: 'createOrder limit+reduceOnly TP', ok: false, msg: e.message.slice(0, 200) }); }

    // Test 6: Check open orders
    const openOrders = await gate.fetchOpenOrders(symbol);
    results.push({ test: 'fetchOpenOrders', count: openOrders.length, orders: openOrders.map((o: any) => ({ id: o.id, type: o.type, side: o.side, price: o.price, stopPrice: (o as any).stopPrice })) });

    return new Response(JSON.stringify({ ok: true, results, capabilities: { createStopLossOrder: gate.has.createStopLossOrder, createTakeProfitOrder: gate.has.createTakeProfitOrder } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch(e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
