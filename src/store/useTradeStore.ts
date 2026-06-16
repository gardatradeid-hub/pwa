import { create } from 'zustand';
import type { Trade, OrderType, TradeSide } from '@/types/trade';
import type { TickerData, OHLCVData } from '@/types/exchange';

interface TradeFormState {
  symbol: string;
  side: TradeSide;
  orderType: OrderType;
  entryPrice: number | null;
  stopLoss: number | null;
  rrRatio: number;
}

interface TradeStore {
  // Active trade form
  form: TradeFormState;
  setSymbol: (symbol: string) => void;
  setSide: (side: TradeSide) => void;
  setOrderType: (orderType: OrderType) => void;
  setEntryPrice: (price: number | null) => void;
  setStopLoss: (price: number | null) => void;
  setRrRatio: (ratio: number) => void;
  resetForm: () => void;

  // Market data
  ticker: TickerData | null;
  ohlcv: OHLCVData[];
  setTicker: (ticker: TickerData | null) => void;
  setOhlcv: (data: OHLCVData[]) => void;

  // Active position
  activeTrade: Trade | null;
  setActiveTrade: (trade: Trade | null) => void;

  // Trade counts
  tradesToday: number;
  maxTradesToday: number;
  setTradesToday: (count: number, max: number) => void;

  // Lock/cooldown
  isLocked: boolean;
  cooldownUntil: string | null;
  setIsLocked: (locked: boolean) => void;
  setCooldownUntil: (until: string | null) => void;

  // Post-trade modal
  showPostTradeModal: boolean;
  lastClosedTradeId: string | null;
  setShowPostTradeModal: (show: boolean, tradeId?: string | null) => void;
}

const DEFAULT_FORM: TradeFormState = {
  symbol: 'BTC/USDT',
  side: 'long',
  orderType: 'market',
  entryPrice: null,
  stopLoss: null,
  rrRatio: 2,
};

export const useTradeStore = create<TradeStore>()((set) => ({
  form: { ...DEFAULT_FORM },
  setSymbol: (symbol) => set((s) => ({ form: { ...s.form, symbol } })),
  setSide: (side) => set((s) => ({ form: { ...s.form, side } })),
  setOrderType: (orderType) => set((s) => ({ form: { ...s.form, orderType } })),
  setEntryPrice: (entryPrice) => set((s) => ({ form: { ...s.form, entryPrice } })),
  setStopLoss: (stopLoss) => set((s) => ({ form: { ...s.form, stopLoss } })),
  setRrRatio: (rrRatio) => set((s) => ({ form: { ...s.form, rrRatio } })),
  resetForm: () => set({ form: { ...DEFAULT_FORM } }),

  ticker: null,
  ohlcv: [],
  setTicker: (ticker) => set({ ticker }),
  setOhlcv: (ohlcv) => set({ ohlcv }),

  activeTrade: null,
  setActiveTrade: (activeTrade) => set({ activeTrade }),

  tradesToday: 0,
  maxTradesToday: 3,
  setTradesToday: (tradesToday, maxTradesToday) => set({ tradesToday, maxTradesToday }),

  isLocked: false,
  cooldownUntil: null,
  setIsLocked: (isLocked) => set({ isLocked }),
  setCooldownUntil: (cooldownUntil) => set({ cooldownUntil }),

  showPostTradeModal: false,
  lastClosedTradeId: null,
  setShowPostTradeModal: (show, tradeId = null) => set({ showPostTradeModal: show, lastClosedTradeId: tradeId }),
}));
