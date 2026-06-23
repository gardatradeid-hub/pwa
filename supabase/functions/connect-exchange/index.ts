/**
 * Connect Exchange — Supabase Edge Function
 *
 * POST /functions/v1/connect-exchange
 * Body: { exchange: 'bybit' | 'binance' | 'okx', api_key: string, api_secret: string }
 *
 * Flow:
 * 1. Auth check (Authorization: Bearer <user JWT>)
 * 2. Validate body
 * 3. Verify credentials by calling fetchBalance() via CCXT (rejects bad keys
 *    before storing them).
 * 4. Encrypt api_key + api_secret with AES-256-GCM via _shared/crypto.ts
 * 5. UPDATE profiles SET exchange, api_key_encrypted, api_secret_encrypted
 * 6. Return success — client never touches plaintext after this call.
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

interface ConnectExchangeRequest {
  exchange: string;
  api_key: string;
  api_secret: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    // --- AUTH ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized — invalid token' }, 401);
    }

    // --- PARSE BODY ---
    let body: ConnectExchangeRequest;
    try {
      body = await req.json();
    } catch (_) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { exchange, api_key, api_secret } = body || {};
    if (!exchange || !api_key || !api_secret) {
      return jsonResponse(
        { error: 'Missing required fields: exchange, api_key, api_secret' },
        400,
      );
    }

    const ExchangeClass = EXCHANGE_CLASSES[exchange];
    if (!ExchangeClass) {
      return jsonResponse({ error: `Unsupported exchange: ${exchange}` }, 400);
    }

    // --- SANITY CHECK CRYPTO BEFORE WE STORE ANYTHING ---
    // Fails fast (e.g. missing API_KEY_ENCRYPTION_SECRET) so we never write
    // plaintext to the DB by mistake.
    try {
      await selfTest();
    } catch (e) {
      console.error('Crypto self-test failed:', (e as Error).message);
      return jsonResponse(
        { error: 'Server crypto not configured. Contact support.' },
        500,
      );
    }

    // --- VERIFY CREDENTIALS BEFORE STORING ---
    // We call fetchBalance() with the user-supplied keys. If they're invalid
    // or missing permissions, exchange throws and we reject the connection.
    try {
      const probe = new ExchangeClass({
        apiKey: api_key,
        secret: api_secret,
        enableRateLimit: true,
        options: { defaultType: 'swap' },
      });
      await probe.fetchBalance();
    } catch (e: any) {
      const msg = e?.message || 'Unknown';
      console.warn('Exchange credential verification failed:', msg);
      return jsonResponse(
        {
          error: 'Exchange credentials rejected. Pastikan API key punya permission Read + Trade dan benar.',
          detail: msg,
        },
        400,
      );
    }

    // --- ENCRYPT + STORE ---
    const apiKeyEnc = await encryptSecret(api_key);
    const apiSecretEnc = await encryptSecret(api_secret);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        exchange,
        api_key_encrypted: apiKeyEnc,
        api_secret_encrypted: apiSecretEnc,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('profiles update failed:', updateError);
      return jsonResponse({ error: 'Failed to store credentials' }, 500);
    }

    return jsonResponse({ success: true, exchange });
  } catch (error: any) {
    console.error('Connect Exchange error:', error?.message || error);
    return jsonResponse(
      {
        success: false,
        error: error?.message || 'Internal server error',
      },
      500,
    );
  }
});
