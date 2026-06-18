export type LockType = 'consecutive_loss' | 'daily_loss' | 'martingale' | 'revenge_trading' | 'evaluation';

export interface GuardrailCheck {
  name: string;
  passed: boolean;
  message: string;
  message_en: string;
  blocking: boolean;
}

export interface LockEvent {
  id: string;
  user_id: string;
  lock_type: LockType;
  duration_hours: number;
  lock_count_this_month: number;
  locked_at: string;
  unlocks_at: string;
  reflection_mistake: string | null;
  reflection_plan: string | null;
  reflection_emotion: string | null;
  reflection_completed: boolean;
}

export interface AppConfig {
  saas_mode: {
    enabled: boolean;
    grace_period_days: number;
  };
  trading_rules: TradingRules;
  phase_config: PhaseConfig;
  lock_config: LockConfig;
  revenge_config: RevengeConfig;
  supported_pairs: string[];
  supported_exchanges: string[];
}

export interface TradingRules {
  leverage: number;
  risk_per_trade_pct: number;
  max_positions: number;
  max_trades_per_day: number;
  daily_loss_limit_r: number;
  total_drawdown_r: number;
  martingale_blocked: boolean;
  averaging_down_blocked: boolean;
}

export interface PhaseConfig {
  phases: PhaseRule[];
}

export interface PhaseRule {
  phase: number;
  label: string;
  label_en: string;
  max_trades: number;
  cooldown_min: number;
  min_rr: number;
  unlock_wr?: number;
  unlock_trades?: number;
}

export interface LockConfig {
  mode: 'FLAT' | 'TIERED';
  consecutive_loss_trigger: number;
  flat_duration_hours: number;
  tiered_schedule: TieredLockRule[];
  tiered_reset: 'monthly';
}

export interface TieredLockRule {
  count: number;
  duration_hours: number;
  trigger_review?: boolean;
}

export interface RevengeConfig {
  detection_window_min: number;
  cooldown_penalty_min: number;
}

export interface DailyStats {
  id: string;
  user_id: string;
  date: string;
  trades_count: number;
  wins: number;
  losses: number;
  pnl_r: number;
  pnl_usdt: number;
  daily_loss_r: number;
  consecutive_losses: number;
  last_trade_closed_at: string | null;
  revenge_blocks: number;
  overtrading_warnings: number;
  martingale_blocks: number;
}

export interface EquitySnapshot {
  id: string;
  user_id: string;
  balance_usdt: number;
  high_water_mark: number;
  drawdown_r: number;
  snapshot_at: string;
}
