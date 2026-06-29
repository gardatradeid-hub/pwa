import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { decryptSecret } from '../_shared/crypto.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: profile } = await supabase.from('profiles').select('*').eq('email', 'ezraricad2@gmail.com').single();
    if (!profile?.exchange) return new Response(JSON.stringify({ error: 'No exchange' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const apiKey = await decryptSecret(profile.api_key_encrypted);
    const apiSecret = await decryptSecret(profile.api_secret_encrypted);
    const gate = new ccxt.gate({ apiKey, secret: apiSecret, options: { defaultType: 'swap' } });
    await gate.loadMarkets();

    const results: any = {};

    // First: check if user has any open position
    const positions = await gate.fetchPositions();
    const activePositions = positions.filter(p => Number(p.contracts) > 0);
    results.positionCount = activePositions.length;

    if (activePositions.length > 0) {
      const pos = activePositions[0];
      results.currentPosition = { symbol: pos.symbol, size: pos.contracts, side: pos.side };

      // Now try SL order on existing position
      const qty = Math.abs(Number(pos.contracts));
      const slSide = pos.side === 'long' ? 'sell' : 'buy';
      const slPrice = pos.side === 'long' ? Number(pos.entryPrice) * 0.98 : Number(pos.entryPrice) * 1.02;

      try {
        const slOrder = await gate.createOrder(pos.symbol, 'stop', slSide, qty, slPrice, { reduceOnly: true });
        results.slOrder = { ok: true, id: slOrder.id };
      } catch(e) { results.slOrder = { ok: false, error: e.message.slice(0, 200) }; }
    } else {
      // No position — test entry order + immediate SL
      results.note = 'No position found — testing entry+SL flow';

      try {
        // 1. Open position (market order)
        const entry = await gate.createOrder('SPCX/USDT:USDT', 'market', 'buy', 1);
        results.entryOrder = { ok: true, id: entry.id, filled: entry.filled };

        // 2. Wait 3s for position
        await new Promise(r => setTimeout(r, 3000));

        // 3. Place SL stop order
        const slEntry = await gate.createOrder('SPCX/USDT:USDT', 'stop', 'sell', 1, 155, { reduceOnly: true });
        results.slAfterEntry = { ok: true, id: slEntry.id };

        // 4. Place TP limit order
        const tpEntry = await gate.createOrder('SPCX/USDT:USDT', 'limit', 'sell', 1, 160, { reduceOnly: true });
        results.tpAfterEntry = { ok: true, id: tpEntry.id };
      } catch(e) { results.fullFlowErr = e.message.slice(0, 300); }
    }

    return new Response(JSON.stringify({ ok: true, results }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch(e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
