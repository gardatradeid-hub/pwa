-- =====================================================
-- Migration: fix gateio → gate in all constraints and seeds
-- =====================================================
-- CCXT uses 'gate' (not 'gateio') as the exchange identifier.

-- 1. Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_exchange_check;

-- 2. Add corrected constraint with 'gate' instead of 'gateio'
ALTER TABLE profiles
  ADD CONSTRAINT profiles_exchange_check
  CHECK (exchange IN (
    'binance','bingx','bitfinex','bitget','bitmex',
    'bybit','coinex','deribit','gate','huobi',
    'kraken','kucoin','mexc','okx','phemex',
    'whitebit','woox'
  ));

-- 3. Update profiles that had 'gateio' to 'gate'
UPDATE profiles SET exchange = 'gate' WHERE exchange = 'gateio';

-- 4. Update supported_exchanges seed
UPDATE app_config
SET value = '["binance","bingx","bitfinex","bitget","bitmex","bybit","coinex","deribit","gate","huobi","kraken","kucoin","mexc","okx","phemex","whitebit","woox"]'::jsonb
WHERE key = 'supported_exchanges';
