-- =====================================================
-- GARDA — Initial Database Schema
-- Migration: 001_initial_schema
-- =====================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  exchange TEXT CHECK (exchange IN ('bybit', 'binance', 'okx')),
  api_key_encrypted TEXT,
  api_secret_encrypted TEXT,
  current_phase INT DEFAULT 1,
  is_early_adopter BOOLEAN DEFAULT FALSE,
  subscription_plan TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  preferred_lang TEXT DEFAULT 'id',
  preferred_theme TEXT DEFAULT 'dark',
  email_verified BOOLEAN DEFAULT FALSE,
  auth_provider TEXT DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TRADES
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  exchange TEXT NOT NULL,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('long', 'short')),
  entry_price DECIMAL NOT NULL,
  stop_loss DECIMAL NOT NULL,
  take_profit DECIMAL NOT NULL,
  exit_price DECIMAL,
  quantity DECIMAL NOT NULL,
  risk_amount DECIMAL NOT NULL,
  rr_ratio DECIMAL NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  pnl_usdt DECIMAL,
  pnl_r DECIMAL,
  emotion_entry TEXT,
  emotion_exit TEXT,
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  exchange_order_id TEXT,
  exchange_sl_order_id TEXT,
  exchange_tp_order_id TEXT
);

CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_opened_at ON trades(opened_at DESC);

-- 3. LOCK EVENTS
CREATE TABLE IF NOT EXISTS lock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  lock_type TEXT NOT NULL CHECK (lock_type IN ('consecutive_loss', 'daily_loss', 'martingale', 'revenge_trading', 'evaluation')),
  duration_hours DECIMAL NOT NULL,
  lock_count_this_month INT DEFAULT 1,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlocks_at TIMESTAMPTZ NOT NULL,
  reflection_mistake TEXT,
  reflection_plan TEXT,
  reflection_emotion TEXT,
  reflection_completed BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_lock_events_user_id ON lock_events(user_id);
CREATE INDEX idx_lock_events_locked_at ON lock_events(locked_at DESC);

-- 4. DAILY STATS
CREATE TABLE IF NOT EXISTS daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  trades_count INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  pnl_r DECIMAL DEFAULT 0,
  pnl_usdt DECIMAL DEFAULT 0,
  daily_loss_r DECIMAL DEFAULT 0,
  consecutive_losses INT DEFAULT 0,
  last_trade_closed_at TIMESTAMPTZ,
  revenge_blocks INT DEFAULT 0,
  overtrading_warnings INT DEFAULT 0,
  martingale_blocks INT DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

-- 5. EQUITY SNAPSHOTS
CREATE TABLE IF NOT EXISTS equity_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  balance_usdt DECIMAL NOT NULL,
  high_water_mark DECIMAL NOT NULL,
  drawdown_r DECIMAL DEFAULT 0,
  snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_equity_snapshots_user ON equity_snapshots(user_id, snapshot_at DESC);

-- 6. REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES profiles(id),
  referred_id UUID REFERENCES profiles(id),
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'onboarded', 'active')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_referrals_code ON referrals(referral_code);

-- 7. APP CONFIG (server-side config, replaces CMS)
CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default config values
INSERT INTO app_config (key, value) VALUES
('saas_mode', '{"enabled": false, "grace_period_days": 30}'),
('trading_rules', '{
  "leverage": 1,
  "risk_per_trade_pct": 1,
  "max_positions": 1,
  "max_trades_per_day": 3,
  "daily_loss_limit_r": 3,
  "total_drawdown_r": 10,
  "martingale_blocked": true,
  "averaging_down_blocked": true
}'),
('phase_config', '{
  "phases": [
    {"phase": 1, "label": "Pemula", "label_en": "Beginner", "max_trades": 3, "cooldown_min": 120, "min_rr": 2.0},
    {"phase": 2, "label": "Terlatih", "label_en": "Intermediate", "max_trades": 4, "cooldown_min": 60, "min_rr": 1.5, "unlock_wr": 0.40, "unlock_trades": 30},
    {"phase": 3, "label": "Professional", "label_en": "Professional", "max_trades": 5, "cooldown_min": 0, "min_rr": 1.0, "unlock_wr": 0.50, "unlock_trades": 60}
  ]
}'),
('lock_config', '{
  "mode": "FLAT",
  "consecutive_loss_trigger": 3,
  "flat_duration_hours": 12,
  "tiered_schedule": [
    {"count": 1, "duration_hours": 12},
    {"count": 2, "duration_hours": 24},
    {"count": 3, "duration_hours": 48, "trigger_review": true}
  ],
  "tiered_reset": "monthly"
}'),
('revenge_config', '{"detection_window_min": 5, "cooldown_penalty_min": 15}'),
('supported_pairs', '["BTC/USDT","ETH/USDT","XRP/USDT","SOL/USDT","BNB/USDT"]'),
('supported_exchanges', '["bybit","binance","okx"]');

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE lock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/write own
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Trades: users read/write own
CREATE POLICY "Users can read own trades" ON trades
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" ON trades
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades" ON trades
  FOR UPDATE USING (auth.uid() = user_id);

-- Lock events: users read own
CREATE POLICY "Users can read own lock events" ON lock_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own lock events" ON lock_events
  FOR UPDATE USING (auth.uid() = user_id);

-- Daily stats: users read own
CREATE POLICY "Users can read own daily stats" ON daily_stats
  FOR SELECT USING (auth.uid() = user_id);

-- Equity snapshots: users read own
CREATE POLICY "Users can read own equity snapshots" ON equity_snapshots
  FOR SELECT USING (auth.uid() = user_id);

-- Referrals: users read own
CREATE POLICY "Users can read own referrals" ON referrals
  FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- App config: readable by all authenticated users
CREATE POLICY "Authenticated users can read app config" ON app_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- =====================================================
-- AUTOMATIC PROFILE CREATION ON SIGNUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  full_name_val TEXT;
  avatar_val TEXT;
  referral_code_val TEXT;
BEGIN
  -- Extract metadata from auth.users raw_user_meta_data
  full_name_val := NEW.raw_user_meta_data ->> 'full_name';
  avatar_val := NEW.raw_user_meta_data ->> 'avatar_url';
  referral_code_val := NEW.raw_user_meta_data ->> 'referral_code';

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    avatar_url,
    auth_provider,
    email_verified
  ) VALUES (
    NEW.id,
    COALESCE(full_name_val, NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(avatar_val, NEW.raw_user_meta_data ->> 'picture'),
    CASE
      WHEN NEW.raw_user_meta_data ->> 'iss' LIKE '%google%' THEN 'google'
      ELSE 'email'
    END,
    CASE
      WHEN NEW.email_confirmed_at IS NOT NULL THEN TRUE
      ELSE FALSE
    END
  );

  -- Handle referral if code provided
  IF referral_code_val IS NOT NULL AND referral_code_val != '' THEN
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code, status)
    SELECT p.id, NEW.id, referral_code_val, 'registered'
    FROM public.profiles p
    WHERE p.id IN (
      SELECT referrer_id FROM public.referrals WHERE referral_code = referral_code_val LIMIT 1
    )
    UNION ALL
    SELECT (
      SELECT id FROM public.profiles
      WHERE id IN (SELECT referrer_id FROM public.referrals WHERE referral_code = referral_code_val)
      LIMIT 1
    ), NEW.id, referral_code_val, 'registered'
    WHERE EXISTS (
      SELECT 1 FROM public.referrals WHERE referral_code = referral_code_val
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- HELPER: Update updated_at on profile changes
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();
