import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { DEFAULT_TRADING_RULES } from '@/config/constants';
import type { GuardrailCheck } from '@/types/guardrails';
import type { Trade, TradeSide } from '@/types/trade';

/**
 * Client-side guardrail engine — PREVIEW ONLY.
 *
 * The authoritative validation runs server-side in
 * supabase/functions/execute-trade/index.ts. This module mirrors all 12
 * checks from spec §6 so the UI can disable the Long/Short button before
 * the user clicks and surface the exact reason inline.
 *
 * Invariants (leverage, risk_per_trade, manual_lot) are not user-supplied
 * here — the form makes them structurally impossible. We still emit the
 * checks so the dot-row in the order panel can show "all 12 OK" rather
 * than "6/6 OK".
 */
export interface GuardrailContext {
  balance: number;
  tradesToday: number;
  activePosition: boolean;
  /** Open trade (if any) — used by averaging-down check. */
  openTrade?: Trade | null;
  dailyLossR: number;
  drawdownR: number;
  /** Last closed trade — used by martingale/revenge check. */
  lastClosedTrade?: Pick<Trade, 'closed_at' | 'symbol' | 'entry_price' | 'side'> | null;
  /** Revenge detection window in minutes (from app_config.revenge_config). */
  revengeWindowMin?: number;
  /** Pending trade form values — needed for min_rr / averaging_down preview. */
  form?: {
    symbol: string;
    side: TradeSide;
    entryPrice: number | null;
    rrRatio: number;
  };
}

/**
 * Run all 12 guardrail checks (client preview). Server is authoritative.
 */
export function runGuardrailChecks(context: GuardrailContext): GuardrailCheck[] {
  const rules = DEFAULT_TRADING_RULES;
  const phase = useUserStore.getState().getCurrentPhase();
  const checks: GuardrailCheck[] = [];

  // 1. Max open positions
  checks.push({
    name: 'max_positions',
    passed: !context.activePosition,
    message: 'Maksimal 1 posisi terbuka',
    message_en: 'Maximum 1 open position',
    blocking: true,
  });

  // 2. Max trades per day
  checks.push({
    name: 'max_trades',
    passed: context.tradesToday < phase.max_trades,
    message: `Maksimal ${phase.max_trades} trade hari ini. Terpakai: ${context.tradesToday}`,
    message_en: `Max ${phase.max_trades} trades today. Used: ${context.tradesToday}`,
    blocking: true,
  });

  // 3. Daily loss limit
  checks.push({
    name: 'daily_loss',
    passed: context.dailyLossR < rules.daily_loss_limit_r,
    message: `Batas kerugian harian ${rules.daily_loss_limit_r}R tercapai`,
    message_en: `Daily loss limit of ${rules.daily_loss_limit_r}R reached`,
    blocking: true,
  });

  // 4. Total drawdown
  checks.push({
    name: 'total_drawdown',
    passed: context.drawdownR < rules.total_drawdown_r,
    message: `Total drawdown ${rules.total_drawdown_r}R tercapai. Mode evaluasi.`,
    message_en: `Total drawdown ${rules.total_drawdown_r}R reached. Evaluation mode.`,
    blocking: true,
  });

  // 5. Cooldown check
  const { cooldownUntil } = useTradeStore.getState();
  const inCooldown = cooldownUntil ? new Date(cooldownUntil) > new Date() : false;
  checks.push({
    name: 'cooldown',
    passed: !inCooldown,
    message: `Cooldown aktif. Tunggu hingga ${cooldownUntil ?? '-'}`,
    message_en: `Cooldown active. Wait until ${cooldownUntil ?? '-'}`,
    blocking: true,
  });

  // 6. Account locked
  const { isLocked } = useTradeStore.getState();
  checks.push({
    name: 'account_locked',
    passed: !isLocked,
    message: 'Akun terkunci. Tidak bisa trading.',
    message_en: 'Account locked. Cannot trade.',
    blocking: true,
  });

  // 7. Leverage — structural invariant, always 1x via position-sizer.
  //    Surfaced so the UI dot row shows the rule is honored.
  checks.push({
    name: 'leverage',
    passed: true,
    message: `Leverage terkunci ${rules.leverage}x`,
    message_en: `Leverage locked at ${rules.leverage}x`,
    blocking: false,
  });

  // 8. Risk per trade — structural invariant (1% of balance, calculated, not entered).
  checks.push({
    name: 'risk_per_trade',
    passed: true,
    message: `Risiko per trade dikunci ${rules.risk_per_trade_pct}R`,
    message_en: `Risk per trade locked at ${rules.risk_per_trade_pct}R`,
    blocking: false,
  });

  // 9. Minimum RR ratio (preview only — server re-validates).
  const rr = context.form?.rrRatio;
  const rrOk = rr == null ? true : rr >= phase.min_rr;
  checks.push({
    name: 'min_rr',
    passed: rrOk,
    message: `Minimal RR 1:${phase.min_rr} untuk Phase ${phase.phase}`,
    message_en: `Minimum RR 1:${phase.min_rr} for Phase ${phase.phase}`,
    blocking: true,
  });

  // 10. Martingale / revenge — re-entry too soon on the same symbol.
  let martingaleOk = true;
  if (
    rules.martingale_blocked &&
    context.lastClosedTrade?.closed_at &&
    context.form &&
    context.lastClosedTrade.symbol === context.form.symbol
  ) {
    const lastClose = new Date(context.lastClosedTrade.closed_at).getTime();
    const minutesSince = (Date.now() - lastClose) / 60000;
    const windowMin = context.revengeWindowMin ?? 5;
    if (minutesSince < windowMin) {
      martingaleOk = false;
    }
  }
  checks.push({
    name: 'martingale',
    passed: martingaleOk,
    message: `Martingale/revenge terdeteksi. Tunggu ${context.revengeWindowMin ?? 5} menit setelah trade terakhir.`,
    message_en: `Martingale/revenge detected. Wait ${context.revengeWindowMin ?? 5} min after last trade.`,
    blocking: true,
  });

  // 11. Averaging down — entry worse than existing open position.
  let averagingOk = true;
  if (
    rules.averaging_down_blocked &&
    context.activePosition &&
    context.openTrade &&
    context.form?.entryPrice != null
  ) {
    const open = context.openTrade;
    const entry = context.form.entryPrice;
    if (
      (open.side === 'long' && entry < open.entry_price) ||
      (open.side === 'short' && entry > open.entry_price)
    ) {
      averagingOk = false;
    }
  }
  checks.push({
    name: 'averaging_down',
    passed: averagingOk,
    message: 'Averaging down diblokir. Tidak bisa menambah posisi di harga yang lebih buruk.',
    message_en: 'Averaging down blocked. Cannot add to a position at a worse price.',
    blocking: true,
  });

  // 12. Manual lot size — structural invariant: TradeFormInputs has no quantity
  //     field, server rejects forbidden fields. Always passes client-side.
  checks.push({
    name: 'manual_lot',
    passed: true,
    message: 'Ukuran posisi dihitung otomatis (1R) — tidak bisa diubah manual',
    message_en: 'Position size is auto-calculated (1R) — manual lot size blocked',
    blocking: false,
  });

  return checks;
}

export function getBlockedChecks(checks: GuardrailCheck[]): GuardrailCheck[] {
  return checks.filter((c) => !c.passed && c.blocking);
}

export function allGuardrailsPassed(checks: GuardrailCheck[]): boolean {
  return getBlockedChecks(checks).length === 0;
}
