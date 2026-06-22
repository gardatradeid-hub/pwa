export type Exchange =
  | 'binance' | 'bingx' | 'bitfinex' | 'bitget' | 'bitmex'
  | 'bybit' | 'coinex' | 'deribit' | 'gateio' | 'huobi'
  | 'kraken' | 'kucoin' | 'mexc' | 'okx' | 'phemex'
  | 'whitebit' | 'woox';

export interface ExchangeInfo {
  id: Exchange;
  name: string;
  logo: string;
  color: string;
  supported: boolean;
}

/**
 * All supported futures exchanges, sorted alphabetically.
 * Logo paths expected at /exchanges/{id}.svg
 */
export const EXCHANGES: Record<Exchange, ExchangeInfo> = {
  binance: {
    id: 'binance',
    name: 'Binance',
    logo: '/exchanges/binance.svg',
    color: '#F0B90B',
    supported: true,
  },
  bingx: {
    id: 'bingx',
    name: 'BingX',
    logo: '/exchanges/bingx.svg',
    color: '#FFB400',
    supported: true,
  },
  bitfinex: {
    id: 'bitfinex',
    name: 'Bitfinex',
    logo: '/exchanges/bitfinex.svg',
    color: '#49A82E',
    supported: true,
  },
  bitget: {
    id: 'bitget',
    name: 'Bitget',
    logo: '/exchanges/bitget.svg',
    color: '#03A9EF',
    supported: true,
  },
  bitmex: {
    id: 'bitmex',
    name: 'BitMEX',
    logo: '/exchanges/bitmex.svg',
    color: '#F4C542',
    supported: true,
  },
  bybit: {
    id: 'bybit',
    name: 'Bybit',
    logo: '/exchanges/bybit.svg',
    color: '#F7A600',
    supported: true,
  },
  coinex: {
    id: 'coinex',
    name: 'CoinEx',
    logo: '/exchanges/coinex.svg',
    color: '#0066FF',
    supported: true,
  },
  deribit: {
    id: 'deribit',
    name: 'Deribit',
    logo: '/exchanges/deribit.svg',
    color: '#45B76C',
    supported: true,
  },
  gateio: {
    id: 'gateio',
    name: 'Gate.io',
    logo: '/exchanges/gateio.svg',
    color: '#D32F5A',
    supported: true,
  },
  huobi: {
    id: 'huobi',
    name: 'Huobi',
    logo: '/exchanges/huobi.svg',
    color: '#2CA6E0',
    supported: true,
  },
  kraken: {
    id: 'kraken',
    name: 'Kraken',
    logo: '/exchanges/kraken.svg',
    color: '#5741D9',
    supported: true,
  },
  kucoin: {
    id: 'kucoin',
    name: 'KuCoin',
    logo: '/exchanges/kucoin.svg',
    color: '#24B47E',
    supported: true,
  },
  mexc: {
    id: 'mexc',
    name: 'MEXC',
    logo: '/exchanges/mexc.svg',
    color: '#00BFA6',
    supported: true,
  },
  okx: {
    id: 'okx',
    name: 'OKX',
    logo: '/exchanges/okx.svg',
    color: '#080808',
    supported: true,
  },
  phemex: {
    id: 'phemex',
    name: 'Phemex',
    logo: '/exchanges/phemex.svg',
    color: '#2D65FF',
    supported: true,
  },
  whitebit: {
    id: 'whitebit',
    name: 'WhiteBIT',
    logo: '/exchanges/whitebit.svg',
    color: '#0075FF',
    supported: true,
  },
  woox: {
    id: 'woox',
    name: 'WOO X',
    logo: '/exchanges/woox.svg',
    color: '#00C2FF',
    supported: true,
  },
};

/**
 * Alphabetically sorted exchange list (for dropdown rendering).
 */
export const EXCHANGE_LIST: ExchangeInfo[] = Object.values(EXCHANGES).sort(
  (a, b) => a.name.localeCompare(b.name),
);

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
