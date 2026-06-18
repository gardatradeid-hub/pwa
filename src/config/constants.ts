export const APP_NAME = 'Garda';
export const APP_TAGLINE = 'Trading Tanpa Emosi';
export const APP_URL = import.meta.env.VITE_APP_URL || 'https://garda.app';

export const SUPPORTED_PAIRS = [
  'BTC/USDT',
  'ETH/USDT',
  'XRP/USDT',
  'SOL/USDT',
  'BNB/USDT',
] as const;

export const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
] as const;

export const RR_OPTIONS = [
  { label: '1:2', value: 2 },
  { label: '1:3', value: 3 },
  { label: '1:5', value: 5 },
] as const;

export const EMOTIONS = [
  'tenang',
  'ragu',
  'fomo',
  'takut',
  'puas',
  'greedy',
  'panik',
  'relief',
] as const;

export const STORAGE_KEYS = {
  THEME: 'garda-theme',
  LANG: 'garda-lang',
  ONBOARDING: 'garda-onboarding',
} as const;

export const MAX_FREE_USERS = 1000;

export const DEFAULT_PHASE_CONFIG = {
  phases: [
    { phase: 1, label: 'Pemula', label_en: 'Beginner', max_trades: 3, cooldown_min: 120, min_rr: 2.0 },
    { phase: 2, label: 'Terlatih', label_en: 'Intermediate', max_trades: 4, cooldown_min: 60, min_rr: 1.5, unlock_wr: 0.40, unlock_trades: 30 },
    { phase: 3, label: 'Professional', label_en: 'Professional', max_trades: 5, cooldown_min: 0, min_rr: 1.0, unlock_wr: 0.50, unlock_trades: 60 },
  ],
};

export const DEFAULT_TRADING_RULES = {
  leverage: 1,
  risk_per_trade_pct: 1,
  max_positions: 1,
  max_trades_per_day: 3,
  daily_loss_limit_r: 3,
  total_drawdown_r: 10,
  martingale_blocked: true,
  averaging_down_blocked: true,
};
