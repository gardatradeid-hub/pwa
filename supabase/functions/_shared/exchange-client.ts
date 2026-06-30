/**
 * Exchange REST API Client — Hybrid CCXT + Native REST
 *
 * Supports: Bybit, Binance, OKX, Bitget, KuCoin, Gate.io
 *
 * Design principle:
 *   - Entry & close orders  → CCXT unified createOrder() (stable)
 *   - SL & TP orders         → Native REST via exchange.sign() + fetch()
 *
 * This module is a PORTABLE reference.
 * Every function documents the exact HTTP method, path, headers, and body
 * so it can be re-implemented in Flutter/Dart without any CCXT dependency.
 *
 * CCXT is used ONLY for:
 *   - Loading market data (fetchTicker, fetchOHLCV, loadMarkets)
 *   - Encryption/signing the native REST request (exchange.sign())
 *   - Entry + close market orders (createOrder)
 *
 * All SL/TP functions use the NATIVE exchange REST API directly,
 * completely bypassing CCXT order creation.
 */

// ================================================================
// UNIVERSAL INTERFACES (portable to any language)
// ================================================================

export interface ExchangeCredentials {
  apiKey: string;
  apiSecret: string;
  /** CCXT exchange instance for signing */
  exchange: any;
}

export interface SlTpParams {
  symbol: string;        // e.g. "SPCX/USDT:USDT" (futures format)
  quantity: number;
  stopLoss: number;      // trigger price for SL
  takeProfit: number;    // limit price for TP
  side: 'long' | 'short';
}

export interface SlTpResult {
  slOrderId: string | null;
  tpOrderId: string | null;
  slError: string | null;
  tpError: string | null;
}

// ================================================================
// BYBIT — Futures V5 REST API
// ================================================================
// Docs: https://bybit-exchange.github.io/docs/v5/order/create-order
// Futures endpoint: POST /v5/order/create
// SL trigger requires triggerDirection + triggerBy

async function placeSlTpBybit(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange, apiKey, apiSecret } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;
  const closeOn = 'CloseOnly';

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // --- SL: stop market, reduceOnly, triggerDirection ---
  try {
    const slBody = {
      category: 'linear',
      symbol: symbol,
      side: side === 'long' ? 'Sell' : 'Buy',
      orderType: 'Market',
      qty: String(quantity),
      triggerPrice: String(stopLoss),
      triggerDirection: side === 'long' ? 2 : 1,          // 2=fall, 1=rise
      triggerBy: 'MarkPrice',
      timeInForce: 'IOC',
      reduceOnly: true,
    };
    const slUrl = '/v5/order/create';
    const signed = exchange.sign(slUrl, 'private', 'POST', slBody);
    const resp = await fetch('https://api.bybit.com' + slUrl, {
      method: 'POST', headers: signed.headers, body: JSON.stringify(slBody),
    });
    const json = await resp.json();
    if (json.retCode === 0) slOrderId = json.result.orderId;
    else slError = `Bybit SL: ${json.retCode} - ${json.retMsg}`;
  } catch (e: any) { slError = `Bybit SL: ${e.message?.slice(0, 200)}`; }

  // --- TP: limit, reduceOnly ---
  try {
    const tpBody = {
      category: 'linear',
      symbol: symbol,
      side: side === 'long' ? 'Sell' : 'Buy',
      orderType: 'Limit',
      qty: String(quantity),
      price: String(takeProfit),
      timeInForce: 'GTC',
      reduceOnly: true,
    };
    const tpUrl = '/v5/order/create';
    const signed = exchange.sign(tpUrl, 'private', 'POST', tpBody);
    const resp = await fetch('https://api.bybit.com' + tpUrl, {
      method: 'POST', headers: signed.headers, body: JSON.stringify(tpBody),
    });
    const json = await resp.json();
    if (json.retCode === 0) tpOrderId = json.result.orderId;
    else tpError = `Bybit TP: ${json.retCode} - ${json.retMsg}`;
  } catch (e: any) { tpError = `Bybit TP: ${e.message?.slice(0, 200)}`; }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// BINANCE — USDⓈ-M Futures REST API
// ================================================================
// Docs: https://binance-docs.github.io/apidocs/futures/en/#new-order
// Endpoint: POST /fapi/v1/order

async function placeSlTpBinance(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;
  const qty = quantity.toFixed(5);

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  const SL_SIDE = side === 'long' ? 'SELL' : 'BUY';

  // --- SL: STOP_MARKET ---
  try {
    const slRes = await (exchange as any).fapiPrivatePostOrder({
      symbol: symbol.replace('/USDT:USDT', 'USDT'),
      side: SL_SIDE,
      type: 'STOP_MARKET',
      quantity: qty,
      stopPrice: stopLoss.toString(),
      reduceOnly: 'true',
      workingType: 'CONTRACT_PRICE',
    });
    slOrderId = slRes?.orderId?.toString() || null;
  } catch (e: any) { slError = `Binance SL: ${e.message?.slice(0, 200)}`; }

  // --- TP: TAKE_PROFIT_MARKET ---
  try {
    const tpRes = await (exchange as any).fapiPrivatePostOrder({
      symbol: symbol.replace('/USDT:USDT', 'USDT'),
      side: SL_SIDE,
      type: 'TAKE_PROFIT_MARKET',
      quantity: qty,
      stopPrice: takeProfit.toString(),
      reduceOnly: 'true',
      workingType: 'CONTRACT_PRICE',
    });
    tpOrderId = tpRes?.orderId?.toString() || null;
  } catch (e: any) { tpError = `Binance TP: ${e.message?.slice(0, 200)}`; }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// OKX — Perpetual Futures REST API
// ================================================================
// Docs: https://www.okx.com/docs-v5/en/#order-book-trading-trade-post-place-order
// Endpoint: POST /api/v5/trade/order

async function placeSlTpOkx(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;
  const tdMode = 'cross';

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // --- SL: conditional market order ---
  try {
    const slRes = await (exchange as any).privatePostTradeOrder({
      instId: symbol.replace('/USDT:USDT', '-USDT-SWAP'),
      tdMode,
      side: side === 'long' ? 'sell' : 'buy',
      ordType: 'conditional',
      sz: String(Math.floor(quantity * 100) / 100),
      triggerPx: String(stopLoss),
      triggerPxType: 'mark',
      ordPx: '-1',         // market order
      reduceOnly: true,
    });
    slOrderId = slRes?.data?.[0]?.ordId || null;
  } catch (e: any) { slError = `OKX SL: ${e.message?.slice(0, 200)}`; }

  // --- TP: conditional limit order ---
  try {
    const tpRes = await (exchange as any).privatePostTradeOrder({
      instId: symbol.replace('/USDT:USDT', '-USDT-SWAP'),
      tdMode,
      side: side === 'long' ? 'sell' : 'buy',
      ordType: 'conditional',
      sz: String(Math.floor(quantity * 100) / 100),
      triggerPx: String(takeProfit),
      triggerPxType: 'mark',
      ordPx: String(takeProfit),
      reduceOnly: true,
    });
    tpOrderId = tpRes?.data?.[0]?.ordId || null;
  } catch (e: any) { tpError = `OKX TP: ${e.message?.slice(0, 200)}`; }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// BITGET — Futures REST API
// ================================================================
// Docs: https://www.bitget.com/api-doc/contract/trade/PlaceOrder
// Endpoint: POST /api/v2/mix/order/place-order

async function placeSlTpBitget(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // --- SL: stop market plan order ---
  try {
    const slRes = await (exchange as any).privateMixPostPlanOrder({
      symbol: symbol.replace('/USDT:USDT', 'USDT_UMCBL'),
      marginCoin: 'USDT',
      side: side === 'long' ? 'close_short' : 'close_long',
      orderType: 'market',
      triggerPrice: String(stopLoss),
      triggerType: 'mark_price',
      size: String(quantity),
      planType: 'loss_plan',
    });
    slOrderId = slRes?.data?.orderId || null;
  } catch (e: any) { slError = `Bitget SL: ${e.message?.slice(0, 200)}`; }

  // --- TP: limit plan order ---
  try {
    const tpRes = await (exchange as any).privateMixPostPlanOrder({
      symbol: symbol.replace('/USDT:USDT', 'USDT_UMCBL'),
      marginCoin: 'USDT',
      side: side === 'long' ? 'close_short' : 'close_long',
      orderType: 'limit',
      executePrice: String(takeProfit),
      triggerPrice: String(takeProfit),
      triggerType: 'mark_price',
      size: String(quantity),
      planType: 'profit_plan',
    });
    tpOrderId = tpRes?.data?.orderId || null;
  } catch (e: any) { tpError = `Bitget TP: ${e.message?.slice(0, 200)}`; }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// KUCOIN — Futures REST API
// ================================================================
// Docs: https://www.kucoin.com/docs/rest/futures-trading/orders/place-order
// Endpoint: POST /api/v1/orders

async function placeSlTpKuCoin(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // --- SL: stop market order ---
  try {
    const slRes = await (exchange as any).privatePostOrders({
      symbol: symbol.replace('/USDT:USDT', 'USDTM'),
      side: side === 'long' ? 'sell' : 'buy',
      type: 'market',
      stop: 'down',           // stop-loss
      stopPriceType: 'MP',
      stopPrice: String(stopLoss),
      size: String(Math.floor(quantity)),
      reduceOnly: true,
      lever: '1',
    });
    slOrderId = slRes?.data?.orderId || null;
  } catch (e: any) { slError = `KuCoin SL: ${e.message?.slice(0, 200)}`; }

  // --- TP: limit order with reduceOnly ---
  try {
    const tpRes = await (exchange as any).privatePostOrders({
      symbol: symbol.replace('/USDT:USDT', 'USDTM'),
      side: side === 'long' ? 'sell' : 'buy',
      type: 'limit',
      price: String(takeProfit),
      size: String(Math.floor(quantity)),
      reduceOnly: true,
      lever: '1',
    });
    tpOrderId = tpRes?.data?.orderId || null;
  } catch (e: any) { tpError = `KuCoin TP: ${e.message?.slice(0, 200)}`; }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// GATE.IO — Perpetual Futures REST API
// ================================================================
// Docs: https://www.gate.io/docs/developers/apiv4/en/#gate-io-futures-api
// Endpoint: POST /api/v4/futures/usdt/price_orders
//
// Gate.io futures uses a SEPARATE endpoint for stop-loss/take-profit
// called "price_orders". This endpoint creates a trigger order that
// auto-fills as market when the trigger price is reached.

async function placeSlTpGateio(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange, apiKey, apiSecret } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // Konversi "SPCX/USDT:USDT" → "SPCX_USDT" (Gate.io contract ID)
  const contract = symbol.includes(':') ? symbol.split(':')[0].replace('/', '_') : symbol.replace('/', '_');

  /**
   * Helper: panggil native Gate.io REST API untuk pasang SL atau TP.
   *
   * Gate.io docs: POST /api/v4/futures/usdt/price_orders
   * Body: { contract, size, price, tif, reduce_only, close, trigger_price_type }
   *
   * trigger_price_type: 1=last_price (default), 2=mark_price, 3=index_price.
   * Menggunakan mark_price (2) mencegah order langsung dieksekusi.
   */
  /**
   * Kirim price_order ke Gate.io dengan otentikasi HMAC-SHA512.
   * Ini SEPENUHNYA melewati CCXT — membangun header auth secara manual
   * sesuai dokumentasi Gate.io API v4.
   */
  async function gateioPriceOrder(triggerPrice: number): Promise<string | null> {
    const closeSize = side === 'long' ? -quantity : quantity;

    // Gate.io HMAC-SHA512 auth
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const bodyStr = JSON.stringify({
      contract,
      size: String(closeSize),
      price: String(triggerPrice),
      tif: 'gtc',
      reduce_only: true,
      close: false,
      trigger_price_type: 2,
    });
    const hashedBody = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(bodyStr));
    const bodyHash = Array.from(new Uint8Array(hashedBody)).map(b => b.toString(16).padStart(2, '0')).join('');
    const method = 'POST';
    const requestPath = '/api/v4/futures/usdt/price_orders';
    const payload = `${method}
${requestPath}

${bodyHash}
${timestamp}`;

    // Encode secret as UTF-8, sign with HMAC-SHA512
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(apiSecret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = await fetch('https://api.gateio.ws' + requestPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'KEY': apiKey,
        'SIGN': sigHex,
        'Timestamp': timestamp,
      },
      body: bodyStr,
    });
    const json = await response.json();

    if (response.ok) {
      // Gate.io returns { id: 123456 } for successful price orders
      const id = json?.id?.toString() || json?.order_id?.toString() || null;
      if (id) return id;
      // Log full response for debugging when ID is missing
      console.warn(`Gate.io price_order OK tapi tanpa ID: ${JSON.stringify(json).slice(0, 500)}`);
      return null;
    }
    console.error(`Gate.io price_order gagal (${response.status}): ${JSON.stringify(json).slice(0, 500)}`);
    return null;
  }

  // Tunggu posisi muncul (maks 22 detik)
  let posFound = false;
  for (let i = 0; i < 15; i++) {
    try {
      const positions = await exchange.fetchPositions();
      const active = positions?.filter((p: any) => Number(p.contracts) > 0);
      if (active && active.length > 0) { posFound = true; break; }
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (!posFound) {
    slError = 'Gate.io SL/TP: posisi tidak muncul setelah 22 detik';
    tpError = 'Gate.io SL/TP: posisi tidak muncul setelah 22 detik';
  } else {
    /**
     * Setelah posisi muncul, pasang SL dan TP.
     *
     * Gate.io HANYA mendukung 1 price_order per posisi. Jadi:
     *   - Pasang SL sebagai price_order.
     *   - TP diskip — tidak bisa 2 price_orders bersamaan.
     */
    // Pasang SL
    try {
      const slId = await gateioPriceOrder(stopLoss);
      if (slId) {
        slOrderId = slId;
      } else {
        slError = 'Gate.io SL: gagal dipasang (response tidak memiliki id)';
      }
    } catch (e: any) {
      slError = 'Gate.io SL: ' + (e.message?.slice(0, 200) || 'unknown');
    }

    // Gate.io batasi 1 price_order per posisi. TP tidak bisa bersamaan dengan SL.
    tpOrderId = null;
    tpError = 'Gate.io: hanya 1 price_order per posisi — SL sudah terpasang';
  }

  return { slOrderId, tpOrderId, slError, tpError };
}

// ================================================================
// UNIFIED DISPATCHER
// ================================================================

const PLACE_SLTP: Record<string, (creds: ExchangeCredentials, params: SlTpParams) => Promise<SlTpResult>> = {
  bybit:   placeSlTpBybit,
  binance: placeSlTpBinance,
  okx:     placeSlTpOkx,
  bitget:  placeSlTpBitget,
  kucoin:  placeSlTpKuCoin,
  gateio:  placeSlTpGateio,
};

/**
 * Place both Stop Loss and Take Profit orders for the given exchange.
 * Returns order IDs + error messages (if any).
 *
 * THIS IS THE ONLY PUBLIC FUNCTION from this module.
 * Execute-trade and close-trade should call this instead of CCXT createOrder for SL/TP.
 *
 * Portability: each placeSlTp* function above documents the exact HTTP call
 * needed, so it can be re-implemented in Flutter/Dart as a simple fetch()
 * with exchange-specific signature headers.
 */
export async function placeSlAndTp(
  creds: ExchangeCredentials,
  exchangeId: string,
  params: SlTpParams,
): Promise<SlTpResult> {
  const fn = PLACE_SLTP[exchangeId];
  if (!fn) return { slOrderId: null, tpOrderId: null, slError: `Unknown exchange: ${exchangeId}`, tpError: null };
  return fn(creds, params);
}
