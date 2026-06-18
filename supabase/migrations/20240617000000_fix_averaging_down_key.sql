-- =====================================================
-- Migration: rename trading_rules.averging_down_blocked → averaging_down_blocked
-- =====================================================
-- The initial schema seed used a typo ("averging" missing the second 'a').
-- This migration renames the JSONB key in app_config so it matches spec v1.0
-- and the client/edge function code. Idempotent: only acts if the typo key
-- exists and the correct key does not.

UPDATE app_config
SET value =
  jsonb_set(
    value - 'averging_down_blocked',
    '{averaging_down_blocked}',
    COALESCE(value->'averging_down_blocked', 'true'::jsonb),
    true
  )
WHERE key = 'trading_rules'
  AND value ? 'averging_down_blocked'
  AND NOT (value ? 'averaging_down_blocked');
