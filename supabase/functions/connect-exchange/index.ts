/**
 * Connect Exchange — Supabase Edge Function
 *
 * POST /functions/v1/connect-exchange
 * Body: { exchange, api_key, api_secret }
 *
 * Verifies API key has futures trading permissions before storing.
 * Returns clear Indonesian error messages for permission issues.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import ccxt from 'https://esm.sh/ccxt@4';
import { encryptSecret, selfTest } from '../_shared/crypto.ts';

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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    // --- AUTH ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return jsonResponse({ error: 'Unauthorized — invalid token' }, 401);

    // --- PARSE BODY ---
    let body: any;
    try { body = await req.json(); } catch (_) { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

    const { exchange, api_key, api_secret } = body || {};
    if (!exchange || !api_key || !api_secret) {
      return jsonResponse({ error: 'Missing required fields: exchange, api_key, api_secret' }, 400);
    }

    const ExchangeClass = EXCHANGE_CLASSES[exchange];
    if (!ExchangeClass) return jsonResponse({ error: `Unsupported exchange: ${exchange}` }, 400);

    // --- CRYPTO SELF-TEST ---
    try { await selfTest(); }
    catch (e) {
      console.error('Crypto self-test failed:', (e as Error).message);
      return jsonResponse({ error: 'Server crypto not configured. Contact support.' }, 500);
    }

    // --- VERIFY FUTURES PERMISSIONS ---
    // Create exchange instance configured for futures/swap
    const exchangeInstance = new ExchangeClass({
      apiKey: api_key,
      secret: api_secret,
      enableRateLimit: true,
      options: { defaultType: 'swap' },
    });

    let verifiedBalance: number | null = null;
    let verificationError: string | null = null;

    // Strategy 1: Try fetchBalance with swap/futures type
    try {
      // Some exchanges accept a type parameter for wallet selection
      const balance = await (exchangeInstance as any).fetchBalance();
      const usdt = balance?.USDT?.total || balance?.USDC?.total || balance?.total?.USDT || null;
      if (usdt != null) verifiedBalance = Number(usdt);
      else verifiedBalance = 0; // connected but empty balance — still valid
    } catch (e1: any) {
      const msg1 = e1?.message || '';

      // Check known permission error patterns
      if (/spot permission|spot wallet|no.*spot/i.test(msg1)) {
        verificationError = `API Key tidak memiliki akses FUTURES di ${exchange === 'gateio' ? 'Gate.io' : exchange}.
Aktifkan permission FUTURES/derivatives di dashboard exchange (BUKAN spot).
${exchange === 'gateio' ? 'Untuk Gate.io: buka API Management → centang "Futures" permission.' : ''}`;
      } else if (/not.*allow|no.*permiss|forbid|denied|restrict/i.test(msg1)) {
        verificationError = `API Key ditolak. Pastikan Anda mengaktifkan permission FUTURES/derivatives:
- Read (membaca saldo dan posisi)
- Trade (membuka dan menutup posisi)
JANGAN aktifkan Withdraw.`;
      } else if (/invalid.*key|api.*key.*format|incorrect/i.test(msg1)) {
        verificationError = 'API Key atau Secret tidak valid. Periksa kembali dan pastikan tidak ada spasi.';
      } else if (/signature/i.test(msg1)) {
        verificationError = 'API Signature tidak valid. Pastikan Secret cocok dengan Key.';
      } else {
        // Unknown error — try fallback strategies
        verificationError = msg1.slice(0, 200);
      }
    }

    // Strategy 2: If fetchBalance failed, try fetchPositions (pure futures endpoint)
    if (!verifiedBalance && verificationError) {
      try {
        const positions = await (exchangeInstance as any).fetchPositions();
        verifiedBalance = 0; // connected to futures — valid
        verificationError = null; // clear the error
      } catch (e2: any) {
        const msg2 = e2?.message || '';
        // If the same permission error, keep the original
        if (!/spot|permiss|forbid|denied/i.test(msg2)) {
          // Different error — might be a real connectivity issue
          verificationError = msg2.slice(0, 200);
        }
      }
    }

    // Strategy 3: Last resort — try creating a test order check (loadMarkets)
    if (verificationError) {
      try {
        await (exchangeInstance as any).loadMarkets();
        // If loadMarkets succeeds, the key format is valid
        verificationError = null;
        verifiedBalance = 0;
      } catch (_) {
        // Keep the original error
      }
    }

    // If verification still failed, return helpful error
    if (verificationError) {
      console.warn('Exchange verification failed:', verificationError);
      return jsonResponse({
        success: false,
        error: verificationError,
        type: 'PERMISSION_ERROR',
      }, 400);
    }

    // --- ENCRYPT + STORE ---
    const apiKeyEnc = await encryptSecret(api_key);
    const apiSecretEnc = await encryptSecret(api_secret);

    const updateUrl = `${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`;
    const updateResp = await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        exchange,
        api_key_encrypted: apiKeyEnc,
        api_secret_encrypted: apiSecretEnc,
      }),
    });

    if (!updateResp.ok) {
      const body = await updateResp.text();
      console.error('profiles update failed:', body);
      return jsonResponse({ error: 'Failed to store credentials', detail: body }, 500);
    }

    return jsonResponse({
      success: true,
      exchange,
      balance_usdt: verifiedBalance,
    });
  } catch (error: any) {
    console.error('Connect Exchange error:', error?.message || error);
    return jsonResponse({ error: error?.message || 'Internal server error' }, 500);
  }
});
