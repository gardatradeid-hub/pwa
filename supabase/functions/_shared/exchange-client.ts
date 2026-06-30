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
  /** Bybit only: 0=one-way (default), 1=hedge long, 2=hedge short */
  positionIdx?: number;
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
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side, positionIdx = 0 } = params;

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // --- SL: stop market, reduceOnly, triggerDirection ---
  try {
    const slBody: Record<string, any> = {
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
      positionIdx: positionIdx,                            // 0=one-way, 1=hedge long, 2=hedge short
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
    const tpBody: Record<string, any> = {
      category: 'linear',
      symbol: symbol,
      side: side === 'long' ? 'Sell' : 'Buy',
      orderType: 'Limit',
      qty: String(quantity),
      price: String(takeProfit),
      timeInForce: 'GTC',
      reduceOnly: true,
      positionIdx: positionIdx,
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
// GATE.IO — Perpetual Futures REST API (Native, hybrid pattern like Bybit)
// ================================================================
// Docs: https://www.gate.io/docs/developers/apiv4/en/#create-a-price-triggered-order
// Endpoint: POST /api/v4/futures/usdt/price_orders
//
// Body schema (from official gateapi-python SDK):
//   {
//     initial: {
//       contract: "BTC_USDT",                     // market id
//       size: 0,                                  // 0 = full close (used with auto_size)
//       price: "0",                               // "0" = market on trigger
//       tif: "ioc",                               // market orders must use ioc
//       reduce_only: true,
//       auto_size: "close_long" | "close_short",  // dual-position mode only
//       text: "api"
//     },
//     trigger: {
//       strategy_type: 0,                         // 0 = price trigger
//       price_type: 1,                            // 1 = MARK price (anti-wick)
//       price: "<trigger price>",
//       rule: 1 | 2,                              // 1: price >= trigger, 2: price <= trigger
//       expiration: 604800                        // seconds (7 days)
//     }
//   }
//
// Rule cheatsheet:
//   long  SL: trigger when price falls below stopLoss   -> rule=2 (price <= trigger)
//   short SL: trigger when price rises above stopLoss   -> rule=1 (price >= trigger)
//   long  TP: trigger when price rises above takeProfit -> rule=1
//   short TP: trigger when price falls below takeProfit -> rule=2
//
// We use exchange.sign() positional args (path, api[], method, params) so
// CCXT handles HMAC-SHA512 + body hashing + the 5-line payload format.
// Crucially: pass the body as `params` (a dict). sign() will JSON-stringify
// it internally — passing a pre-stringified body produces the wrong hash.

async function placeSlTpGateio(creds: ExchangeCredentials, params: SlTpParams): Promise<SlTpResult> {
  const { exchange } = creds;
  const { symbol, quantity, stopLoss, takeProfit, side } = params;

  let slOrderId: string | null = null;
  let slError: string | null = null;
  let tpOrderId: string | null = null;
  let tpError: string | null = null;

  // Contract id: CCXT futures format "BTC/USDT:USDT" -> Gate.io id "BTC_USDT"
  const mkt = (exchange as any).markets?.[symbol];
  const contract: string = mkt?.id ?? symbol.replace('/USDT:USDT', '_USDT').replace('/', '_');

  // Detect dual-position mode from the futures account. Single-mode and
  // dual-mode require different body shapes:
  //   single -> { close: true } and no auto_size
  //   dual   -> { auto_size: "close_long" | "close_short" } and no close
  // Default to single on detection failure (more common for retail users).
  let inDualMode = false;
  try {
    const acctSigned = (exchange as any).sign(
      'usdt/accounts',
      ['private', 'futures'],
      'GET',
      {},
    );
    const acctResp = await fetch(acctSigned.url, {
      method: 'GET',
      headers: acctSigned.headers,
    });
    const acct = await acctResp.json();
    inDualMode = Boolean(acct?.in_dual_mode);
  } catch (_) { /* default false */ }

  // Build the initial-order half of the price_orders body. We use size=0
  // (full close on trigger) so partial-fill mismatches between our recorded
  // quantity and the actual open position don't cause "size mismatch" errors.
  const buildInitial = () => {
    const base: Record<string, any> = {
      contract,
      size: 0,
      price: '0',
      tif: 'ioc',
      reduce_only: true,
      text: 't-garda',
    };
    if (inDualMode) {
      base.auto_size = side === 'long' ? 'close_long' : 'close_short';
    } else {
      base.close = true;
    }
    return base;
  };

  const buildBody = (triggerPrice: number, rule: 1 | 2) => ({
    initial: buildInitial(),
    trigger: {
      strategy_type: 0,
      price_type: 1,                 // 1 = mark price (anti-wick)
      price: String(triggerPrice),
      rule,                          // 1: price >= trigger, 2: price <= trigger
      expiration: 604800,            // 7 days
    },
  });

  const postPriceOrder = async (body: Record<string, any>) => {
    // sign() positional args: (path, [auth, type], method, params).
    // params is a dict — sign() JSON-stringifies it internally and hashes
    // the resulting string. Passing a pre-stringified body produces a
    // signature that won't match the body we send.
    const signed = (exchange as any).sign(
      'usdt/price_orders',
      ['private', 'futures'],
      'POST',
      body,
    );
    const resp = await fetch(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: signed.body,
    });
    const text = await resp.text();
    let json: any;
    try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return { ok: resp.ok, status: resp.status, json };
  };

  const extractId = (j: any): string | null => {
    // Gate.io returns the trigger order id as `id` (number). On success
    // the id is non-zero and `status` is "open".
    if (j && (typeof j.id === 'number' || typeof j.id === 'string') && String(j.id) !== '0') {
      return String(j.id);
    }
    return null;
  };

  // --- SL ---
  try {
    const slRule: 1 | 2 = side === 'long' ? 2 : 1;
    const r = await postPriceOrder(buildBody(stopLoss, slRule));
    const id = extractId(r.json);
    if (r.ok && id) {
      slOrderId = id;
    } else {
      slError = `Gate.io SL [${r.status}]: ${r.json?.label || ''} ${r.json?.message || JSON.stringify(r.json).slice(0, 200)}`.trim();
    }
  } catch (e: any) { slError = 'Gate.io SL: ' + (e.message?.slice(0, 200) || 'unknown'); }

  // --- TP ---
  try {
    const tpRule: 1 | 2 = side === 'long' ? 1 : 2;
    const r = await postPriceOrder(buildBody(takeProfit, tpRule));
    const id = extractId(r.json);
    if (r.ok && id) {
      tpOrderId = id;
    } else {
      tpError = `Gate.io TP [${r.status}]: ${r.json?.label || ''} ${r.json?.message || JSON.stringify(r.json).slice(0, 200)}`.trim();
    }
  } catch (e: any) { tpError = 'Gate.io TP: ' + (e.message?.slice(0, 200) || 'unknown'); }

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
