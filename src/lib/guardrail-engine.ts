import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { DEFAULT_TRADING_RULES } from '@/config/constants';
import type { GuardrailCheck } from '@/types/guardrails';

export interface GuardrailContext {
  balance: number;
  tradesToday: number;
  activePosition: boolean;
  lastLossCount: number;
  dailyLossR: number;
  drawdownR: number;
}

/**
 * Run all guardrail checks before executing a trade.
 * Returns list of checks with pass/fail status.
 */
export function runGuardrailChecks(context: GuardrailContext): GuardrailCheck[] {
  const rules = DEFAULT_TRADING_RULES;
  const phase = useUserStore.getState().getCurrentPhase();
  const checks: GuardrailCheck[] = [];

  // 1. Max open positions
  const positionCheck: GuardrailCheck = {
    name: 'max_positions',
    passed: !context.activePosition,
    message: 'Maksimal 1 posisi terbuka',
    message_en: 'Maximum 1 open position',
    blocking: true,
  };
  checks.push(positionCheck);

  // 2. Max trades per day
  const tradesCheck: GuardrailCheck = {
    name: 'max_trades',
    passed: context.tradesToday < phase.max_trades,
    message: `Maksimal ${phase.max_trades} trade hari ini. Terpakai: ${context.tradesToday}`,
    message_en: `Max ${phase.max_trades} trades today. Used: ${context.tradesToday}`,
    blocking: true,
  };
  checks.push(tradesCheck);

  // 3. Daily loss limit
  const dailyLossCheck: GuardrailCheck = {
    name: 'daily_loss',
    passed: context.dailyLossR < rules.daily_loss_limit_r,
    message: `Batas kerugian harian ${rules.daily_loss_limit_r}R tercapai`,
    message_en: `Daily loss limit of ${rules.daily_loss_limit_r}R reached`,
    blocking: true,
  };
  checks.push(dailyLossCheck);

  // 4. Total drawdown
  const drawdownCheck: GuardrailCheck = {
    name: 'total_drawdown',
    passed: context.drawdownR < rules.total_drawdown_r,
    message: `Total drawdown ${rules.total_drawdown_r}R tercapai. Mode evaluasi.`,
    message_en: `Total drawdown ${rules.total_drawdown_r}R reached. Evaluation mode.`,
    blocking: true,
  };
  checks.push(drawdownCheck);

  // 5. Cooldown check
  const { cooldownUntil } = useTradeStore.getState();
  const inCooldown = cooldownUntil ? new Date(cooldownUntil) > new Date() : false;
  const cooldownCheck: GuardrailCheck = {
    name: 'cooldown',
    passed: !inCooldown,
    message: `Cooldown aktif. Tunggu hingga ${cooldownUntil}`,
    message_en: `Cooldown active. Wait until ${cooldownUntil}`,
    blocking: true,
  };
  checks.push(cooldownCheck);

  // 6. Account locked
  const { isLocked } = useTradeStore.getState();
  const lockCheck: GuardrailCheck = {
    name: 'account_locked',
    passed: !isLocked,
    message: 'Akun terkunci. Tidak bisa trading.',
    message_en: 'Account locked. Cannot trade.',
    blocking: true,
  };
  checks.push(lockCheck);

  return checks;
}

export function getBlockedChecks(checks: GuardrailCheck[]): GuardrailCheck[] {
  return checks.filter((c) => !c.passed && c.blocking);
}

export function allGuardrailsPassed(checks: GuardrailCheck[]): boolean {
  return getBlockedChecks(checks).length === 0;
}
