import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type Time,
  ColorType,
} from 'lightweight-charts';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { useTimer } from '@/hooks/useTimer';
import { fetchTicker, fetchOHLCV, executeTrade, closeTrade } from '@/lib/ccxt-proxy';
import { formatUSDT, formatPrice, formatR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { OHLCVData, TickerData } from '@/types/exchange';
import {
  Clock, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Coins,
  ChevronDown, Loader2, Info, Lock,
} from 'lucide-react';

// =====================================================
// TOAST
// =====================================================
type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message: string;
}

function ToastNotification({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5_000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const colors: Record<ToastType, string> = {
    success: 'border-garda-cyan/40 bg-garda-cyan/10 text-garda-cyan',
    error: 'border-garda-pink/40 bg-garda-pink/10 text-garda-pink',
    info: 'border-garda-amber/40 bg-garda-amber/10 text-garda-amber',
  };

  const icons: Record<ToastType, typeof CheckCircle2> = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  };

  const Icon = icons[toast.type];

  return (
    <div
      onClick={onDismiss}
      className={cn(
        'p-4 rounded-xl border animate-slide-up cursor-pointer transition-opacity hover:opacity-80',
        colors[toast.type],
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && <p className="opacity-80 text-xs mt-1">{toast.message}</p>}
        </div>
      </div>
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const addToast = useCallback((type: ToastType, title: string, message = '') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
  }, []);
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return { toasts, addToast, removeToast };
}

// =====================================================
// CANDLESTICK CHART — lightweight-charts v5, Bybit-style
// =====================================================

const TIMEFRAMES = [
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '1H', value: '1h' },
  { label: '4H', value: '4h' },
  { label: '1D', value: '1d' },
] as const;

const REFETCH_INTERVALS: Record<string, number> = {
  '5m': 10_000,
  '15m': 15_000,
  '1h': 30_000,
  '4h': 60_000,
  '1d': 60_000,
};

const CHART_COLORS = {
  background: '#0A0A14',
  text: '#8A8AA0',
  grid: 'rgba(42, 42, 62, 0.6)',
  border: '#2A2A3E',
  candleUp: '#00E5C3',
  candleDown: '#FF0080',
  wickUp: '#00E5C3',
  wickDown: '#FF0080',
  volumeUp: 'rgba(0, 229, 195, 0.3)',
  volumeDown: 'rgba(255, 0, 128, 0.3)',
  crosshair: '#4A4A6A',
};

export interface PositionLines {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  side: 'long' | 'short';
}

interface CandlestickChartProps {
  ohlcv: OHLCVData[];
  ticker: TickerData | null;
  selectedTimeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLoading: boolean;
  positionLines?: PositionLines | null;
}

function CandlestickChart({
  ohlcv, ticker, selectedTimeframe, onTimeframeChange, isLoading, positionLines,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  // Price-line refs so we can remove/update cleanly
  const entryLineRef = useRef<any>(null);
  const slLineRef = useRef<any>(null);
  const tpLineRef = useRef<any>(null);

  // --- Init chart (runs once) ---
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_COLORS.background },
        textColor: CHART_COLORS.text,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: CHART_COLORS.crosshair },
        horzLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: CHART_COLORS.crosshair },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.border,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: CHART_COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.candleUp,
      downColor: CHART_COLORS.candleDown,
      borderUpColor: CHART_COLORS.candleUp,
      borderDownColor: CHART_COLORS.candleDown,
      wickUpColor: CHART_COLORS.wickUp,
      wickDownColor: CHART_COLORS.wickDown,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    resize();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, []);

  // --- Update candle & volume data ---
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candles: CandlestickData[] = ohlcv.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumes: HistogramData[] = ohlcv.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    }));

    candleSeriesRef.current.setData(candles);
    volumeSeriesRef.current.setData(volumes);
    chartRef.current?.timeScale().fitContent();
  }, [ohlcv]);

  // --- Draw/remove price lines (entry / SL / TP) ---
  useEffect(() => {
    const series = candleSeriesRef.current;
    if (!series) return;

    // Remove old
    if (entryLineRef.current) { series.removePriceLine(entryLineRef.current); entryLineRef.current = null; }
    if (slLineRef.current) { series.removePriceLine(slLineRef.current); slLineRef.current = null; }
    if (tpLineRef.current) { series.removePriceLine(tpLineRef.current); tpLineRef.current = null; }

    if (!positionLines) return;

    const { entryPrice, stopLoss, takeProfit } = positionLines;

    // Entry line — white dashed (only when position is actually open)
    if (entryPrice > 0) {
      entryLineRef.current = series.createPriceLine({
        price: entryPrice,
        color: '#FFFFFF',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: formatPrice(entryPrice),
      });
    }

    // SL — pink dashed
    if (stopLoss > 0) {
      slLineRef.current = series.createPriceLine({
        price: stopLoss,
        color: '#FF0080',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `SL ${formatPrice(stopLoss)}`,
      });
    }

    // TP — cyan dashed
    if (takeProfit > 0) {
      tpLineRef.current = series.createPriceLine({
        price: takeProfit,
        color: '#00E5C3',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `TP ${formatPrice(takeProfit)}`,
      });
    }
  }, [positionLines]);

  const changeColor = (ticker?.changePercent ?? 0) >= 0 ? 'text-garda-cyan' : 'text-garda-pink';

  return (
    <div className="space-y-3">
      {/* Ticker header */}
      {ticker && (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold font-mono-num">
              {formatPrice(ticker.last)}
            </span>
            <span className={cn('ml-2 text-sm font-mono-num', changeColor)}>
              {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent?.toFixed(2)}%
            </span>
          </div>
          <div className="text-xs text-garda-text-muted space-x-3 font-mono-num">
            <span>H: {formatPrice(ticker.high)}</span>
            <span>L: {formatPrice(ticker.low)}</span>
            <span>V: {(ticker.volume ?? 0).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Timeframe selector */}
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onTimeframeChange(tf.value)}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-medium transition-colors',
              selectedTimeframe === tf.value
                ? 'bg-garda-cyan text-[#0A0A14]'
                : 'text-garda-text-muted hover:text-garda-text-secondary',
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative w-full h-[280px] rounded-xl border border-garda-border overflow-hidden bg-garda-bg">
        {isLoading && ohlcv.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-garda-bg/80">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-garda-cyan mx-auto mb-2 animate-spin" />
              <p className="text-xs text-garda-text-muted">Memuat chart...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

// =====================================================
// ORDER PANEL — Bybit-style layout
// =====================================================

const SUPPORTED_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'BNB/USDT'];
const RR_OPTIONS = [2, 3, 5];
const QTY_PERCENTS = [25, 50, 75, 100];

function getCoinUnit(symbol: string): string {
  return symbol.split('/')[0] || 'BTC';
}

interface OrderPanelProps {
  balance: number;
  ticker: TickerData | null;
  maxTrades: number;
  tradesToday: number;
  activeTrade: any;
  isLocked: boolean;
  cooldownUntil: string | null;
  onExecute: (side: 'long' | 'short', data: any) => Promise<void>;
  onClose: () => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  onPositionLinesChange: (lines: PositionLines | null) => void;
}

function OrderPanel({
  balance, ticker, maxTrades, tradesToday, activeTrade,
  isLocked, cooldownUntil, onExecute, onClose, isSubmitting, error,
  onPositionLinesChange,
}: OrderPanelProps) {
  const { t } = useTranslation();
  const cooldown = useTimer(cooldownUntil);

  const [symbol, setSymbol] = useState('BTC/USDT');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [rrRatio, setRrRatio] = useState(2);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);

  const coinUnit = getCoinUnit(symbol);
  const currentPrice = entryPrice || ticker?.last || 0;

  // ---- Auto-calc TP from SL + RR ----
  const takeProfit = useMemo(() => {
    if (!currentPrice || !stopLoss || stopLoss <= 0) return 0;
    const distance = Math.abs(currentPrice - stopLoss);
    if (stopLoss < currentPrice) {
      return currentPrice + distance * rrRatio;   // long
    } else {
      return currentPrice - distance * rrRatio;   // short
    }
  }, [currentPrice, stopLoss, rrRatio]);

  // ---- Position sizing (1R = 1% balance) ----
  const riskAmount = balance * 0.01;
  const slDistance = currentPrice && stopLoss ? Math.abs(currentPrice - stopLoss) : 0;
  const quantity = slDistance > 0 ? riskAmount / slDistance : 0;
  const margin = quantity * currentPrice;
  const potentialProfit = riskAmount * rrRatio;

  // ---- Qty percent buttons ----
  const handleQtyPercent = (pct: number) => {
    if (!ticker?.last) return;
    const maxQty = balance / ticker.last;
    const newQty = maxQty * (pct / 100);
    if (newQty > 0) {
      const dist = riskAmount / newQty;
      setStopLoss(Number((currentPrice - dist).toFixed(2)));
    }
  };

  // ---- Push SL/TP lines to chart when user is inputting ----
  useEffect(() => {
    if (currentPrice > 0 && stopLoss && stopLoss > 0 && takeProfit > 0) {
      const side: 'long' | 'short' = stopLoss < currentPrice ? 'long' : 'short';
      onPositionLinesChange({
        entryPrice: 0,   // no entry line yet (position not open)
        stopLoss,
        takeProfit,
        side,
      });
    } else {
      onPositionLinesChange(null);
    }
  }, [currentPrice, stopLoss, takeProfit]);

  // ---- Auto-fill market entry price from ticker ----
  useEffect(() => {
    if (orderType === 'market' && ticker?.last && !entryPrice) {
      setEntryPrice(ticker.last);
    }
  }, [ticker?.last, orderType]);

  const canTrade =
    !isLocked &&
    (cooldown?.isExpired ?? true) &&
    !activeTrade &&
    tradesToday < maxTrades &&
    !isSubmitting &&
    currentPrice > 0 &&
    stopLoss != null && stopLoss > 0 &&
    quantity > 0;

  const handleSubmit = (side: 'long' | 'short') => {
    onExecute(side, {
      symbol,
      entryPrice: currentPrice,
      stopLoss,
      takeProfit,
      rrRatio,
      quantity,
      riskAmount,
      margin,
    });
  };

  // ---- Live P&L for active trade ----
  const livePnl = useMemo(() => {
    if (!activeTrade || !ticker?.last) return null;
    const current = ticker.last;
    const entry = activeTrade.entry_price;
    const qty = activeTrade.quantity;
    const side = activeTrade.side;

    const pnlUsdt = side === 'long'
      ? (current - entry) * qty
      : (entry - current) * qty;
    const pnlPercent = (pnlUsdt / (entry * qty)) * 100;
    const pnlR = activeTrade.risk_amount > 0 ? pnlUsdt / activeTrade.risk_amount : 0;

    return { usdt: pnlUsdt, percent: pnlPercent, r: pnlR, isProfit: pnlUsdt >= 0 };
  }, [activeTrade, ticker?.last]);

  return (
    <div className="space-y-4">
      {/* ======== ACTIVE TRADE CARD ======== */}
      {activeTrade && (
        <div className="garda-card p-4 space-y-3 border-garda-cyan/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTrade.side === 'long' ? (
                <TrendingUp className="w-4 h-4 text-garda-cyan" />
              ) : (
                <TrendingDown className="w-4 h-4 text-garda-pink" />
              )}
              <div>
                <p className="font-bold font-mono-num">{activeTrade.symbol}</p>
                <p className="text-xs text-garda-text-muted">{activeTrade.side.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono-num text-garda-text-secondary">
                Entry: {formatPrice(activeTrade.entry_price)}
              </p>
              <p className="text-xs font-mono-num text-garda-text-muted">
                SL: {formatPrice(activeTrade.stop_loss)} &nbsp; TP: {formatPrice(activeTrade.take_profit)}
              </p>
            </div>
          </div>

          {livePnl && (
            <div className={cn(
              'flex items-center justify-between p-3 rounded-lg',
              livePnl.isProfit ? 'bg-garda-cyan/10' : 'bg-garda-pink/10',
            )}>
              <span className="text-sm text-garda-text-secondary">P&amp;L</span>
              <div className="text-right">
                <p className={cn(
                  'font-mono-num font-bold text-lg',
                  livePnl.isProfit ? 'text-garda-cyan' : 'text-garda-pink',
                )}>
                  {livePnl.isProfit ? '+' : ''}{livePnl.usdt.toFixed(2)} USDT
                </p>
                <p className={cn(
                  'font-mono-num text-xs',
                  livePnl.isProfit ? 'text-garda-cyan' : 'text-garda-pink',
                )}>
                  {livePnl.isProfit ? '+' : ''}{livePnl.percent.toFixed(2)}%
                  &nbsp;·&nbsp;
                  {livePnl.isProfit ? '+' : ''}{livePnl.r.toFixed(2)}R
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-garda-pink/10 border border-garda-pink/30
                       text-garda-pink font-semibold text-sm hover:bg-garda-pink/20 transition-colors
                       disabled:opacity-50"
          >
            {isSubmitting ? t('common.loading') : t('active_trade.close_trade')}
          </button>
        </div>
      )}

      {/* ======== ORDER FORM ======== */}
      {!activeTrade && (
        <>
          {/* 1. Symbol picker */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolPicker(!showSymbolPicker)}
              className="garda-input w-full flex items-center justify-between text-left"
            >
              <span className="font-mono-num font-medium">{symbol}</span>
              <ChevronDown className={cn(
                'w-4 h-4 text-garda-text-muted transition-transform',
                showSymbolPicker && 'rotate-180',
              )} />
            </button>
            {showSymbolPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-garda-card border border-garda-border rounded-lg z-10 shadow-lg">
                {SUPPORTED_SYMBOLS.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      setSymbol(sym);
                      setShowSymbolPicker(false);
                      setStopLoss(null);
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left font-mono-num text-sm hover:bg-garda-surface transition-colors',
                      sym === symbol ? 'text-garda-cyan' : 'text-garda-text-secondary',
                    )}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. Market / Limit toggle */}
          <div className="flex bg-garda-input rounded-lg p-1">
            {(['market', 'limit'] as const).map((ot) => (
              <button
                key={ot}
                onClick={() => setOrderType(ot)}
                className={cn(
                  'flex-1 py-2 text-xs font-medium rounded-md transition-colors capitalize',
                  orderType === ot ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary',
                )}
              >
                {t(`trade.${ot}`)}
              </button>
            ))}
          </div>

          {/* 3. Order Price */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-xs font-medium text-garda-text-secondary">
                {t('trade.order_price')}
              </label>
              <span className="text-xs text-garda-text-muted font-mono-num">
                {t('trade.last_price')}: {ticker ? formatPrice(ticker.last) : '—'}
              </span>
            </div>
            {orderType === 'market' ? (
              <div className="garda-input w-full flex items-center justify-between cursor-not-allowed opacity-70">
                <span className="font-mono-num font-medium">{t('trade.market_price')}</span>
                <span className="text-xs text-garda-text-muted">USDT</span>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="number"
                  value={entryPrice ?? ''}
                  onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : null)}
                  placeholder="0.00"
                  className="garda-input w-full font-mono-num pr-14"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-garda-text-muted">
                  USDT
                </span>
              </div>
            )}
          </div>

          {/* 4. Qty + Margin side-by-side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-garda-text-secondary mb-1.5">
                {t('trade.qty')}
              </label>
              <div className="garda-input w-full flex items-center justify-between cursor-not-allowed opacity-70">
                <span className="font-mono-num font-medium">
                  {quantity > 0 ? quantity.toFixed(4) : '0.00'}
                </span>
                <span className="text-xs text-garda-text-muted">{coinUnit}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-garda-text-secondary mb-1.5">
                {t('trade.margin')}
              </label>
              <div className="garda-input w-full flex items-center justify-between cursor-not-allowed opacity-70">
                <span className="font-mono-num font-medium">
                  {margin > 0 ? formatPrice(margin) : '0.00'}
                </span>
                <span className="text-xs text-garda-text-muted">USDT</span>
              </div>
            </div>
          </div>

          {/* 5. Qty percent buttons */}
          <div className="flex gap-2">
            {QTY_PERCENTS.map((pct) => (
              <button
                key={pct}
                onClick={() => handleQtyPercent(pct)}
                className="flex-1 py-1.5 rounded text-xs font-medium border border-garda-border
                           text-garda-text-secondary hover:border-garda-cyan/50 hover:text-garda-cyan
                           transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>

          {/* 6. TP/SL Settings header */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-garda-text-secondary">
              {t('trade.tp_sl')}
            </label>
            <span className="text-xs font-mono-num font-semibold text-garda-pink">
              {t('trade.risk')}: ${riskAmount.toFixed(2)}
            </span>
          </div>

          {/* 7. TP + SL side-by-side (TP locked auto, SL user-input) */}
          <div className="grid grid-cols-2 gap-3">
            {/* TP — read-only, auto-calc */}
            <div className="garda-input flex items-center gap-2 cursor-not-allowed opacity-80">
              <span className="text-xs text-garda-cyan font-medium">TP</span>
              <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
              <span className="font-mono-num text-sm text-garda-cyan truncate">
                {takeProfit > 0 ? formatPrice(takeProfit) : 'Auto'}
              </span>
              <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
            </div>
            {/* SL — user input, TP re-calculates automatically */}
            <div className="garda-input flex items-center gap-2">
              <span className="text-xs text-garda-pink font-medium">SL</span>
              <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
              <input
                type="number"
                value={stopLoss ?? ''}
                onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : null)}
                placeholder="Auto"
                className="bg-transparent font-mono-num text-sm text-garda-pink w-full outline-none"
              />
              <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
            </div>
          </div>

          {/* 8. RR Ratio selector */}
          <div className="flex gap-2">
            {RR_OPTIONS.map((rr) => (
              <button
                key={rr}
                onClick={() => setRrRatio(rr)}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-mono-num font-medium border transition-colors',
                  rrRatio === rr
                    ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan'
                    : 'border-garda-border text-garda-text-secondary',
                )}
              >
                1:{rr}
              </button>
            ))}
            <button
              disabled
              className="flex-1 py-2 rounded-lg text-sm font-medium border
                         border-garda-border text-garda-text-muted opacity-50 cursor-not-allowed"
            >
              Max RR
            </button>
          </div>

          {/* 9. Info rows */}
          <div className="space-y-2 pt-1">
            <div className="flex justify-between text-sm">
              <span className="text-garda-text-muted">{t('trade.available_balance')}</span>
              <span className="font-mono-num font-medium">{formatUSDT(balance)} USDT</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-garda-text-muted">{t('trade.potential_profit')}</span>
              <span className="font-mono-num font-medium text-garda-cyan">
                {potentialProfit > 0
                  ? `+$${potentialProfit.toFixed(2)} (+${((potentialProfit / balance) * 100).toFixed(1)}%)`
                  : '+$0.00 (+0.0%)'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-garda-text-muted">{t('trade.risk_limit')}</span>
              <span className="font-mono-num font-medium">
                {tradesToday}/{maxTrades} Trades
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10
                            border border-garda-pink/20 text-garda-pink text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Cooldown banner */}
          {cooldownUntil && !cooldown.isExpired && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-amber/10
                            border border-garda-amber/20 text-garda-amber text-sm">
              <Clock className="w-4 h-4" />
              {t('dashboard.cooldown_remaining', { minutes: Math.ceil(cooldown.totalSeconds / 60) })}
            </div>
          )}

          {/* Locked notice */}
          {isLocked && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10
                            border border-garda-pink/20">
              <AlertCircle className="w-4 h-4 text-garda-pink" />
              <span className="text-sm text-garda-pink">{t('lock.cant_trade')}</span>
            </div>
          )}

          {/* 10. LONG / SHORT buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => handleSubmit('long')}
              disabled={!canTrade}
              className="garda-btn-long flex-1"
            >
              {t('trade.long_buy')}
            </button>
            <button
              onClick={() => handleSubmit('short')}
              disabled={!canTrade}
              className="garda-btn-short flex-1"
            >
              {t('trade.short_sell')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// =====================================================
// TRADE PAGE MAIN
// =====================================================
export default function TradePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { balance } = useUserStore();
  const tradeStore = useTradeStore();
  const phase = useUserStore.getState().getCurrentPhase();
  const { toasts, addToast, removeToast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [tf, setTf] = useState('15m');
  const [ohlcv, setOhlcv] = useState<OHLCVData[]>([]);
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [positionLines, setPositionLines] = useState<PositionLines | null>(null);

  const symbol = tradeStore.form.symbol || 'BTC/USDT';

  // ---- Fetch market data ----
  const fetchMarketData = useCallback(async () => {
    try {
      const [tickerData, ohlcvData] = await Promise.all([
        fetchTicker(symbol),
        fetchOHLCV(symbol, tf, 100),
      ]);
      if (tickerData) setTicker(tickerData);
      if (ohlcvData.length > 0) setOhlcv(ohlcvData);
    } catch (err) {
      console.error('Fetch market data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, tf]);

  useEffect(() => {
    setIsLoading(ohlcv.length === 0);
    fetchMarketData();
  }, [symbol, tf]);

  // Poll ticker
  useEffect(() => {
    const interval = REFETCH_INTERVALS[tf] ?? 15_000;
    const poll = setInterval(async () => {
      const td = await fetchTicker(symbol);
      if (td) setTicker(td);
    }, interval);
    return () => clearInterval(poll);
  }, [symbol, tf]);

  // Redirect if locked
  useEffect(() => {
    if (tradeStore.isLocked) navigate('/app/locked');
  }, [tradeStore.isLocked]);

  // When active trade exists, push its entry/SL/TP to chart lines
  useEffect(() => {
    if (tradeStore.activeTrade) {
      setPositionLines({
        entryPrice: tradeStore.activeTrade.entry_price,
        stopLoss: tradeStore.activeTrade.stop_loss,
        takeProfit: tradeStore.activeTrade.take_profit,
        side: tradeStore.activeTrade.side,
      });
    }
  }, [tradeStore.activeTrade]);

  // ---- Execute trade ----
  const handleExecute = async (side: 'long' | 'short', data: any) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await executeTrade({ ...data, side });
      if (!result.success) {
        setError(result.error || 'Guardrail checks failed');
        addToast('error', 'Trade Gagal', result.error || '');
        return;
      }
      tradeStore.setActiveTrade(result.trade);
      tradeStore.setTradesToday(tradeStore.tradesToday + 1, phase.max_trades);
      addToast(
        'success',
        'Trade Terbuka',
        `${side.toUpperCase()} ${data.symbol} @ ${formatPrice(data.entryPrice)}`,
      );
    } catch (e: any) {
      setError(e.message);
      addToast('error', 'Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- Close trade ----
  const handleClose = async () => {
    if (!tradeStore.activeTrade) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await closeTrade(tradeStore.activeTrade.id);
      if (result.success) {
        tradeStore.setActiveTrade(null);
        setPositionLines(null);
        tradeStore.setShowPostTradeModal(true, tradeStore.activeTrade.id);
        addToast(
          result.pnl?.isWin ? 'success' : 'info',
          result.pnl?.isWin ? 'Trade Ditutup — Win' : 'Trade Ditutup — Loss',
          `PnL: ${result.pnl?.usdt?.toFixed(2) ?? '?'} USDT · ${result.pnl?.r?.toFixed(2) ?? '?'}R`,
        );
        if (result.lockTriggered) {
          tradeStore.setIsLocked(true);
          setTimeout(() => navigate('/app/locked'), 1500);
        }
        if (result.evaluationTriggered) {
          setTimeout(() => navigate('/app/evaluation'), 1500);
        }
      } else {
        setError(result.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="px-4 py-6 space-y-4 pb-24">
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <ToastNotification key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.trade')}</h1>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-garda-text-muted" />
          <span className="text-sm font-mono-num text-garda-text-secondary">
            {balance !== null ? formatUSDT(balance) : '...'} USDT
          </span>
        </div>
      </div>

      {/* Chart */}
      <CandlestickChart
        ohlcv={ohlcv}
        ticker={ticker}
        selectedTimeframe={tf}
        onTimeframeChange={setTf}
        isLoading={isLoading}
        positionLines={positionLines}
      />

      {/* Order Panel */}
      <OrderPanel
        balance={balance || 1000}
        ticker={ticker}
        maxTrades={phase.max_trades}
        tradesToday={tradeStore.tradesToday}
        activeTrade={tradeStore.activeTrade}
        isLocked={tradeStore.isLocked}
        cooldownUntil={tradeStore.cooldownUntil}
        onExecute={handleExecute}
        onClose={handleClose}
        isSubmitting={isSubmitting}
        error={error}
        onPositionLinesChange={setPositionLines}
      />
    </div>
  );
}
