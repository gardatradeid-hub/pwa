import type { TradeFormInputs, PositionSizeResult } from '@/types/trade';

/**
 * Calculate position size based on 1R risk model.
 * 1R = 1% of current balance.
 */
export function calculatePositionSize(
  inputs: TradeFormInputs,
  balance: number
): PositionSizeResult {
  const { entryPrice, stopLoss, rrRatio, side } = inputs;

  const riskPercent = 0.01; // 1% fixed
  const riskAmount = balance * riskPercent;
  const leverage = 1; // Fixed 1x

  // Distance from entry to stop loss in percentage
  const slDistancePct = Math.abs(entryPrice - stopLoss) / entryPrice;

  if (slDistancePct <= 0) {
    return {
      quantity: 0,
      margin: 0,
      takeProfit: 0,
      riskAmount,
      potentialProfit: 0,
      leverage,
    };
  }

  // Position size = riskAmount / (entryPrice * slDistancePct)
  const positionValue = riskAmount / slDistancePct;
  const quantity = positionValue / entryPrice;

  // Take profit calculation
  const tpDistance = slDistancePct * rrRatio;
  const takeProfit =
    side === 'long'
      ? entryPrice * (1 + tpDistance)
      : entryPrice * (1 - tpDistance);

  // Margin = position value (with 1x leverage it equals position value)
  const margin = positionValue;

  // Potential profit in USDT
  const potentialProfit = riskAmount * rrRatio;

  return {
    quantity,
    margin,
    takeProfit,
    riskAmount,
    potentialProfit,
    leverage,
  };
}

/**
 * Calculate R-multiple from trade result
 */
export function calculateRMultiple(
  entryPrice: number,
  exitPrice: number,
  stopLoss: number,
  side: 'long' | 'short'
): number {
  if (side === 'long') {
    return (exitPrice - entryPrice) / (entryPrice - stopLoss);
  }
  return (entryPrice - exitPrice) / (stopLoss - entryPrice);
}
