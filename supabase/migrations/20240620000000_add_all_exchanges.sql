-- =====================================================
-- Migration: add all supported futures exchanges
-- =====================================================
-- Drops the old 3-exchange CHECK constraint and adds all 17.
-- Also updates the supported_exchanges seed in app_config.
-- Idempotent: uses IF NOT EXISTS for new constraint.

-- 1. Drop old CHECK constraint (already applied in initial migration)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_exchange_check;

-- 2. Add new CHECK with all 17 exchanges
ALTER TABLE profiles
  ADD CONSTRAINT profiles_exchange_check
  CHECK (exchange IN (
    'binance','bingx','bitfinex','bitget','bitmex',
    'bybit','coinex','deribit','gateio','huobi',
    'kraken','kucoin','mexc','okx','phemex',
    'whitebit','woox'
  ));

-- 3. Update supported_exchanges seed in app_config
UPDATE app_config
SET value = '["binance","bingx","bitfinex","bitget","bitmex","bybit","coinex","deribit","gateio","huobi","kraken","kucoin","mexc","okx","phemex","whitebit","woox"]'::jsonb
WHERE key = 'supported_exchanges';
