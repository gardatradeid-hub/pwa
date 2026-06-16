export type TradeSide = 'long' | 'short';
export type TradeStatus = 'open' | 'closed';
export type OrderType = 'market' | 'limit';

export interface Trade {
  id: string;
  user_id: string;
  exchange: string;
  symbol: string;
  side: TradeSide;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  exit_price: number | null;
  quantity: number;
  risk_amount: number;
  rr_ratio: number;
  status: TradeStatus;
  pnl_usdt: number | null;
  pnl_r: number | null;
  emotion_entry: string | null;
  emotion_exit: string | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
  exchange_order_id: string | null;
  exchange_sl_order_id: string | null;
  exchange_tp_order_id: string | null;
}

export interface TradeFormInputs {
  symbol: string;
  side: TradeSide;
  orderType: OrderType;
  entryPrice: number;
  stopLoss: number;
  rrRatio: number;
}

export interface PositionSizeResult {
  quantity: number;
  margin: number;
  takeProfit: number;
  riskAmount: number;
  potentialProfit: number;
  leverage: number;
}
