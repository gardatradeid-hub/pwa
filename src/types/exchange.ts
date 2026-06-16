export type Exchange = 'bybit' | 'binance' | 'okx';

export interface ExchangeInfo {
  id: string;
  name: string;
  logo: string;
  color: string;
  supported: boolean;
}

export const EXCHANGES: Record<Exchange, ExchangeInfo> = {
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    logo: '/exchanges/bybit.svg',
    color: '#F7A600',
    supported: true,
  },
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    color: '#F0B90B',
    supported: true,
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    logo: '/exchanges/okx.svg',
    color: '#080808',
    supported: true,
  },
};

export interface TickerData {
  symbol: string;
  last: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  changePercent: number;
  timestamp: number;
}

export interface OHLCVData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BalanceInfo {
  asset: string;
  free: number;
  used: number;
  total: number;
}

export interface ExchangeBalance {
  total_usdt: number;
  available_usdt: number;
  used_usdt: number;
  balances: BalanceInfo[];
}

export interface ExchangePosition {
  symbol: string;
  side: string;
  size: number;
  entry_price: number;
  mark_price: number;
  unrealized_pnl: number;
  liquidation_price: number | null;
}
