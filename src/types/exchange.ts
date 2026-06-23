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
  /** Nama permission futures yang harus diaktifkan user di dashboard exchange */
  requiredPermission: string;
  /** URL halaman create API key di exchange tsb */
  apiDocUrl: string;
}

export const EXCHANGES: Record<Exchange, ExchangeInfo> = {
  binance: {
    id: 'binance', name: 'Binance', logo: '/exchanges/binance.svg', color: '#F0B90B', supported: true,
    requiredPermission: 'Enable USDⓈ-M Futures (Trade + Read)',
    apiDocUrl: 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072',
  },
  bingx: {
    id: 'bingx', name: 'BingX', logo: '/exchanges/bingx.svg', color: '#FFB400', supported: true,
    requiredPermission: 'Futures — Allow Trade + Read',
    apiDocUrl: 'https://bingx.com/en/support/',
  },
  bitfinex: {
    id: 'bitfinex', name: 'Bitfinex', logo: '/exchanges/bitfinex.svg', color: '#49A82E', supported: true,
    requiredPermission: 'Derivatives — Execute Orders + Read',
    apiDocUrl: 'https://docs.bitfinex.com/docs/api-key-setup',
  },
  bitget: {
    id: 'bitget', name: 'Bitget', logo: '/exchanges/bitget.svg', color: '#03A9EF', supported: true,
    requiredPermission: 'Futures — Trade + Read (USDT-M)',
    apiDocUrl: 'https://www.bitget.com/academy/',
  },
  bitmex: {
    id: 'bitmex', name: 'BitMEX', logo: '/exchanges/bitmex.svg', color: '#F4C542', supported: true,
    requiredPermission: 'API Key — Order + Read',
    apiDocUrl: 'https://www.bitmex.com/app/apiKeys',
  },
  bybit: {
    id: 'bybit', name: 'Bybit', logo: '/exchanges/bybit.svg', color: '#F7A600', supported: true,
    requiredPermission: 'Derivatives — Read + Trade (jangan aktifkan Withdraw)',
    apiDocUrl: 'https://www.bybit.com/en/help-center/article/How-to-Create-API-Key',
  },
  coinex: {
    id: 'coinex', name: 'CoinEx', logo: '/exchanges/coinex.svg', color: '#0066FF', supported: true,
    requiredPermission: 'Futures — Read + Trade',
    apiDocUrl: 'https://support.coinex.com/',
  },
  deribit: {
    id: 'deribit', name: 'Deribit', logo: '/exchanges/deribit.svg', color: '#45B76C', supported: true,
    requiredPermission: 'API Keys — Read + Trade',
    apiDocUrl: 'https://docs.deribit.com/#api-key-setup',
  },
  gateio: {
    id: 'gateio', name: 'Gate.io', logo: '/exchanges/gateio.svg', color: '#D32F5A', supported: true,
    requiredPermission: 'Futures Wallet — PERMIT (bukan Spot)',
    apiDocUrl: 'https://www.gate.io/faq/api-keys',
  },
  huobi: {
    id: 'huobi', name: 'Huobi', logo: '/exchanges/huobi.svg', color: '#2CA6E0', supported: true,
    requiredPermission: 'Futures — Read + Trade',
    apiDocUrl: 'https://www.huobi.com/en-us/support/',
  },
  kraken: {
    id: 'kraken', name: 'Kraken', logo: '/exchanges/kraken.svg', color: '#5741D9', supported: true,
    requiredPermission: 'Futures API — Read + Trade',
    apiDocUrl: 'https://support.kraken.com/hc/en-us/articles/360000919966-API-key-setup',
  },
  kucoin: {
    id: 'kucoin', name: 'KuCoin', logo: '/exchanges/kucoin.svg', color: '#24B47E', supported: true,
    requiredPermission: 'Futures — Trade + Read',
    apiDocUrl: 'https://www.kucoin.com/support/',
  },
  mexc: {
    id: 'mexc', name: 'MEXC', logo: '/exchanges/mexc.svg', color: '#00BFA6', supported: true,
    requiredPermission: 'Futures — Read + Trade',
    apiDocUrl: 'https://www.mexc.com/support/',
  },
  okx: {
    id: 'okx', name: 'OKX', logo: '/exchanges/okx.svg', color: '#080808', supported: true,
    requiredPermission: 'Derivatives — Trade + Read',
    apiDocUrl: 'https://www.okx.com/account/my-api',
  },
  phemex: {
    id: 'phemex', name: 'Phemex', logo: '/exchanges/phemex.svg', color: '#2D65FF', supported: true,
    requiredPermission: 'Derivatives API — Trade + Read',
    apiDocUrl: 'https://phemex.com/support/',
  },
  whitebit: {
    id: 'whitebit', name: 'WhiteBIT', logo: '/exchanges/whitebit.svg', color: '#0075FF', supported: true,
    requiredPermission: 'Futures — Read + Trade',
    apiDocUrl: 'https://whitebit.com/support/',
  },
  woox: {
    id: 'woox', name: 'WOO X', logo: '/exchanges/woox.svg', color: '#00C2FF', supported: true,
    requiredPermission: 'Futures — Trade + Read',
    apiDocUrl: 'https://woox.org/support/',
  },
};

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
