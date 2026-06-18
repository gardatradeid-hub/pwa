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
import { formatUSDT, formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { OHLCVData, TickerData } from '@/types/exchange';
import {
  Clock, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Coins,
  ChevronDown, Loader2, Info, Lock,
} from 'lucide-react';

/* ================================================================
   TOAST
   ================================================================ */
type ToastType = 'success' | 'error' | 'info';
interface Toast { id: number; type: ToastType; title: string; message: string; }

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
  const icons: Record<ToastType, typeof CheckCircle2> = { success: CheckCircle2, error: AlertCircle, info: Info };
  const Icon = icons[toast.type];
  return (
    <div onClick={onDismiss} className={cn('p-3 rounded-xl border animate-slide-up cursor-pointer transition-opacity hover:opacity-80', colors[toast.type])}>
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-xs">{toast.title}</p>
          {toast.message && <p className="opacity-80 text-[11px] mt-0.5">{toast.message}</p>}
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
  const removeToast = useCallback((id: number) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);
  return { toasts, addToast, removeToast };
}

/* ================================================================
   CANDLESTICK CHART
   ================================================================ */
const TIMEFRAMES = [
  { label: '5M', value: '5m' }, { label: '15M', value: '15m' },
  { label: '1H', value: '1h' }, { label: '4H', value: '4h' }, { label: '1D', value: '1d' },
] as const;

const TICKER_POLL_MS = 5_000; // poll ticker every 5s regardless of tf

const CHART_COLORS = {
  background: '#0A0A14', text: '#8A8AA0',
  grid: 'rgba(42, 42, 62, 0.6)', border: '#2A2A3E',
  candleUp: '#00E5C3', candleDown: '#FF0080',
  wickUp: '#00E5C3', wickDown: '#FF0080',
  volumeUp: 'rgba(0, 229, 195, 0.3)', volumeDown: 'rgba(255, 0, 128, 0.3)',
  crosshair: '#4A4A6A',
};

export interface PositionLines {
  entryPrice: number; stopLoss: number; takeProfit: number; side: 'long' | 'short';
}

interface CandlestickChartProps {
  ohlcv: OHLCVData[]; ticker: TickerData | null;
  selectedTimeframe: string; onTimeframeChange: (tf: string) => void;
  isLoading: boolean; positionLines?: PositionLines | null;
}

function CandlestickChart({
  ohlcv, ticker, selectedTimeframe, onTimeframeChange, isLoading, positionLines,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const entryLineRef = useRef<any>(null), slLineRef = useRef<any>(null), tpLineRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: CHART_COLORS.background }, textColor: CHART_COLORS.text },
      grid: { vertLines: { color: CHART_COLORS.grid }, horzLines: { color: CHART_COLORS.grid } },
      crosshair: {
        mode: 0,
        vertLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: CHART_COLORS.crosshair },
        horzLine: { color: CHART_COLORS.crosshair, labelBackgroundColor: CHART_COLORS.crosshair },
      },
      rightPriceScale: { borderColor: CHART_COLORS.border, scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: CHART_COLORS.border, timeVisible: true, secondsVisible: false },
      handleScroll: { vertTouchDrag: false },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: CHART_COLORS.candleUp, downColor: CHART_COLORS.candleDown,
      borderUpColor: CHART_COLORS.candleUp, borderDownColor: CHART_COLORS.candleDown,
      wickUpColor: CHART_COLORS.wickUp, wickDownColor: CHART_COLORS.wickDown,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    chartRef.current = chart; candleSeriesRef.current = candleSeries; volumeSeriesRef.current = volumeSeries;
    const resize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
    };
    resize(); window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); chart.remove(); chartRef.current = null; candleSeriesRef.current = null; volumeSeriesRef.current = null; };
  }, []);

  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current) return;
    candleSeriesRef.current.setData(ohlcv.map((c) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
    volumeSeriesRef.current.setData(ohlcv.map((c) => ({
      time: c.time as Time, value: c.volume,
      color: c.close >= c.open ? CHART_COLORS.volumeUp : CHART_COLORS.volumeDown,
    })));
    chartRef.current?.timeScale().fitContent();
  }, [ohlcv]);

  useEffect(() => {
    const series = candleSeriesRef.current; if (!series) return;
    [entryLineRef, slLineRef, tpLineRef].forEach((r) => { if (r.current) { series.removePriceLine(r.current); r.current = null; } });
    if (!positionLines) return;
    const { entryPrice, stopLoss, takeProfit } = positionLines;
    if (entryPrice > 0) entryLineRef.current = series.createPriceLine({ price: entryPrice, color: '#FFFFFF', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: formatPrice(entryPrice) });
    if (stopLoss > 0) slLineRef.current = series.createPriceLine({ price: stopLoss, color: '#FF0080', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `SL ${formatPrice(stopLoss)}` });
    if (takeProfit > 0) tpLineRef.current = series.createPriceLine({ price: takeProfit, color: '#00E5C3', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `TP ${formatPrice(takeProfit)}` });
  }, [positionLines]);

  const changeColor = (ticker?.changePercent ?? 0) >= 0 ? 'text-garda-cyan' : 'text-garda-pink';
  return (
    <div className="space-y-2">
      {ticker && (
        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold font-mono-num">{formatPrice(ticker.last)}</span>
            <span className={cn('ml-2 text-xs font-mono-num', changeColor)}>
              {ticker.changePercent >= 0 ? '+' : ''}{ticker.changePercent?.toFixed(2)}%
            </span>
          </div>
          <div className="text-[11px] text-garda-text-muted space-x-2 font-mono-num">
            <span>H: {formatPrice(ticker.high)}</span>
            <span>L: {formatPrice(ticker.low)}</span>
            <span>V: {(ticker.volume ?? 0).toLocaleString()}</span>
          </div>
        </div>
      )}
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <button key={tf.value} onClick={() => onTimeframeChange(tf.value)}
            className={cn('px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
              selectedTimeframe === tf.value ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-muted hover:text-garda-text-secondary')}>
            {tf.label}
          </button>
        ))}
      </div>
      <div className="relative w-full h-[220px] rounded-lg border border-garda-border overflow-hidden bg-garda-bg">
        {isLoading && ohlcv.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-garda-bg/80">
            <div className="text-center">
              <Loader2 className="w-6 h-6 text-garda-cyan mx-auto mb-1.5 animate-spin" />
              <p className="text-[11px] text-garda-text-muted">Memuat chart...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}

/* ================================================================
   ORDER PANEL — Bybit-style compact
   ================================================================ */
const SUPPORTED_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'BNB/USDT'];
const RR_OPTIONS = [2, 3, 5];
const QTY_PERCENTS = [25, 50, 75, 100];

function getCoinUnit(symbol: string) { return symbol.split('/')[0] || 'BTC'; }

interface OrderPanelProps {
  balance: number; ticker: TickerData | null; maxTrades: number; tradesToday: number;
  activeTrade: any; isLocked: boolean; cooldownUntil: string | null;
  onExecute: (side: 'long' | 'short', data: any) => Promise<void>;
  onClose: () => Promise<void>;
  isSubmitting: boolean; error: string | null;
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
  const [qtyPct, setQtyPct] = useState(100);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);

  const coinUnit = getCoinUnit(symbol);
  const currentPrice = entryPrice || ticker?.last || 0;

  // TP auto-calc from SL + RR
  const takeProfit = useMemo(() => {
    if (!currentPrice || !stopLoss || stopLoss <= 0) return 0;
    const d = Math.abs(currentPrice - stopLoss);
    return stopLoss < currentPrice ? currentPrice + d * rrRatio : currentPrice - d * rrRatio;
  }, [currentPrice, stopLoss, rrRatio]);

  // Position sizing — percent-based margin usage (like isolated)
  const marginUsed = balance * (qtyPct / 100);
  const quantity = currentPrice > 0 ? marginUsed / currentPrice : 0;
  const slDistance = currentPrice && stopLoss ? Math.abs(currentPrice - stopLoss) : 0;
  const riskAmount = slDistance * quantity;
  const potentialProfit = marginUsed > 0 && stopLoss && currentPrice && slDistance > 0
    ? riskAmount * rrRatio : 0;

  // Reset fields when symbol changes
  useEffect(() => {
    setStopLoss(null);
    setEntryPrice(null);
    setQtyPct(100);
  }, [symbol]);

  // Auto-fill market entry price from ticker
  useEffect(() => {
    if (orderType === 'market' && ticker?.last) setEntryPrice(ticker.last);
  }, [ticker?.last, orderType, symbol]);

  // Push SL/TP lines to chart
  useEffect(() => {
    if (currentPrice > 0 && stopLoss && stopLoss > 0 && takeProfit > 0) {
      onPositionLinesChange({ entryPrice: 0, stopLoss, takeProfit, side: stopLoss < currentPrice ? 'long' : 'short' });
    } else { onPositionLinesChange(null); }
  }, [currentPrice, stopLoss, takeProfit]);

  const canTrade = !isLocked && (cooldown?.isExpired ?? true) && !activeTrade &&
    tradesToday < maxTrades && !isSubmitting && currentPrice > 0 && stopLoss != null && stopLoss > 0 && quantity > 0;

  const handleSubmit = (side: 'long' | 'short') => onExecute(side, { symbol, entryPrice: currentPrice, stopLoss, takeProfit, rrRatio, quantity, riskAmount, margin: marginUsed });

  // Live P&L
  const livePnl = useMemo(() => {
    if (!activeTrade || !ticker?.last) return null;
    const c = ticker.last, e = activeTrade.entry_price, q = activeTrade.quantity, s = activeTrade.side;
    const u = s === 'long' ? (c - e) * q : (e - c) * q;
    const p = (u / (e * q)) * 100, r = activeTrade.risk_amount > 0 ? u / activeTrade.risk_amount : 0;
    return { usdt: u, percent: p, r, isProfit: u >= 0 };
  }, [activeTrade, ticker?.last]);

  return (
    <div className="space-y-2.5 text-[13px]">
      {/* ---- Active trade card ---- */}
      {activeTrade && (
        <div className="garda-card p-3 space-y-2.5 border-garda-cyan/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {activeTrade.side === 'long' ? <TrendingUp className="w-3.5 h-3.5 text-garda-cyan" /> : <TrendingDown className="w-3.5 h-3.5 text-garda-pink" />}
              <div>
                <p className="font-bold font-mono-num text-sm">{activeTrade.symbol}</p>
                <p className="text-[11px] text-garda-text-muted">{activeTrade.side.toUpperCase()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono-num text-garda-text-secondary">Entry: {formatPrice(activeTrade.entry_price)}</p>
              <p className="text-[11px] font-mono-num text-garda-text-muted">SL: {formatPrice(activeTrade.stop_loss)} &nbsp; TP: {formatPrice(activeTrade.take_profit)}</p>
            </div>
          </div>
          {livePnl && (
            <div className={cn('flex items-center justify-between p-2.5 rounded-lg', livePnl.isProfit ? 'bg-garda-cyan/10' : 'bg-garda-pink/10')}>
              <span className="text-xs text-garda-text-secondary">P&amp;L (live)</span>
              <div className="text-right">
                <p className={cn('font-mono-num font-bold text-sm', livePnl.isProfit ? 'text-garda-cyan' : 'text-garda-pink')}>
                  {livePnl.isProfit ? '+' : ''}{livePnl.usdt.toFixed(2)} USDT
                </p>
                <p className={cn('font-mono-num text-[11px]', livePnl.isProfit ? 'text-garda-cyan' : 'text-garda-pink')}>
                  {livePnl.isProfit ? '+' : ''}{livePnl.percent.toFixed(2)}% · {livePnl.isProfit ? '+' : ''}{livePnl.r.toFixed(2)}R
                </p>
              </div>
            </div>
          )}
          <button onClick={onClose} disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-garda-pink/10 border border-garda-pink/30 text-garda-pink font-semibold text-xs hover:bg-garda-pink/20 transition-colors disabled:opacity-50">
            {isSubmitting ? t('common.loading') : t('active_trade.close_trade')}
          </button>
        </div>
      )}

      {/* ---- Order form ---- */}
      {!activeTrade && (<>
        {/* Symbol */}
        <div className="relative">
          <button onClick={() => setShowSymbolPicker(!showSymbolPicker)}
            className="garda-input w-full flex items-center justify-between text-left py-2 text-xs">
            <span className="font-mono-num font-medium">{symbol}</span>
            <ChevronDown className={cn('w-3.5 h-3.5 text-garda-text-muted transition-transform', showSymbolPicker && 'rotate-180')} />
          </button>
          {showSymbolPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-garda-card border border-garda-border rounded-lg z-10 shadow-lg">
              {SUPPORTED_SYMBOLS.map((sym) => (
                <button key={sym} onClick={() => { setSymbol(sym); setShowSymbolPicker(false); }}
                  className={cn('w-full px-3 py-2 text-left font-mono-num text-xs hover:bg-garda-surface transition-colors',
                    sym === symbol ? 'text-garda-cyan' : 'text-garda-text-secondary')}>{sym}</button>
              ))}
            </div>
          )}
        </div>

        {/* Market/Limit toggle */}
        <div className="flex bg-garda-input rounded-md p-0.5">
          {(['market', 'limit'] as const).map((ot) => (
            <button key={ot} onClick={() => setOrderType(ot)}
              className={cn('flex-1 py-1.5 text-[11px] font-medium rounded transition-colors capitalize',
                orderType === ot ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary')}>
              {t(`trade.${ot}`)}
            </button>
          ))}
        </div>

        {/* Order Price */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-[11px] font-medium text-garda-text-secondary">{t('trade.order_price')}</label>
            <span className="text-[11px] text-garda-text-muted font-mono-num">{t('trade.last_price')}: {ticker ? formatPrice(ticker.last) : '—'}</span>
          </div>
          {orderType === 'market' ? (
            <div className="garda-input w-full flex items-center justify-between py-2 text-xs cursor-not-allowed opacity-80">
              <span className="font-mono-num font-medium text-garda-text">{t('trade.market_price')} {ticker ? formatPrice(ticker.last) : '...'}</span>
              <span className="text-[11px] text-garda-text-muted">USDT</span>
            </div>
          ) : (
            <div className="relative">
              <input type="number" value={entryPrice ?? ''} onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : null)}
                placeholder="0.00" className="garda-input w-full font-mono-num pr-12 py-2 text-xs" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-garda-text-muted">USDT</span>
            </div>
          )}
        </div>

        {/* Qty + Margin side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1">{t('trade.qty')}</label>
            <div className="garda-input w-full flex items-center justify-between py-2 text-xs cursor-not-allowed opacity-70">
              <span className="font-mono-num font-medium">{quantity > 0 ? quantity.toFixed(4) : '0.00'}</span>
              <span className="text-[11px] text-garda-text-muted">{coinUnit}</span>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1">{t('trade.margin')}</label>
            <div className="garda-input w-full flex items-center justify-between py-2 text-xs cursor-not-allowed opacity-70">
              <span className="font-mono-num font-medium">{marginUsed > 0 ? formatPrice(marginUsed) : '0.00'}</span>
              <span className="text-[11px] text-garda-text-muted">USDT</span>
            </div>
          </div>
        </div>

        {/* Qty % buttons */}
        <div className="flex gap-1.5">
          {QTY_PERCENTS.map((pct) => (
            <button key={pct} onClick={() => setQtyPct(pct)}
              className={cn('flex-1 py-1 rounded text-[11px] font-medium border transition-colors',
                qtyPct === pct ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan' : 'border-garda-border text-garda-text-secondary hover:border-garda-cyan/50')}>
              {pct}%
            </button>
          ))}
        </div>

        {/* TP/SL header */}
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-garda-text-secondary">{t('trade.tp_sl')}</label>
          <span className="text-[11px] font-mono-num font-semibold text-garda-pink">{t('trade.risk')}: ${riskAmount.toFixed(2)}</span>
        </div>

        {/* TP + SL side-by-side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="garda-input flex items-center gap-1.5 py-2 text-xs cursor-not-allowed opacity-80">
            <span className="text-[11px] text-garda-cyan font-medium">TP</span>
            <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
            <span className="font-mono-num text-xs text-garda-cyan truncate">{takeProfit > 0 ? formatPrice(takeProfit) : 'Auto'}</span>
            <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
          </div>
          <div className="garda-input flex items-center gap-1.5 py-2 text-xs">
            <span className="text-[11px] text-garda-pink font-medium">SL</span>
            <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
            <input type="number" value={stopLoss ?? ''} onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : null)}
              placeholder="Auto" className="bg-transparent font-mono-num text-xs text-garda-pink w-full outline-none" />
            <Lock className="w-3 h-3 text-garda-text-muted shrink-0" />
          </div>
        </div>

        {/* RR Ratio */}
        <div className="flex gap-1.5">
          {RR_OPTIONS.map((rr) => (
            <button key={rr} onClick={() => setRrRatio(rr)}
              className={cn('flex-1 py-1.5 rounded text-[11px] font-mono-num font-medium border transition-colors',
                rrRatio === rr ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan' : 'border-garda-border text-garda-text-secondary')}>
              1:{rr}
            </button>
          ))}
          <button disabled
            className="flex-1 py-1.5 rounded text-[11px] font-medium border border-garda-border text-garda-text-muted opacity-50 cursor-not-allowed">
            Max RR
          </button>
        </div>

        {/* Info rows */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex justify-between text-xs">
            <span className="text-garda-text-muted">{t('trade.available_balance')}</span>
            <span className="font-mono-num font-medium">{formatUSDT(balance)} USDT</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-garda-text-muted">{t('trade.potential_profit')}</span>
            <span className="font-mono-num font-medium text-garda-cyan">
              {potentialProfit > 0 ? `+$${potentialProfit.toFixed(2)} (+${((potentialProfit / balance) * 100).toFixed(1)}%)` : '+$0.00 (+0.0%)'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-garda-text-muted">{t('trade.risk_limit')}</span>
            <span className="font-mono-num font-medium">{tradesToday}/{maxTrades} Trades</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-[11px]">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
          </div>
        )}

        {/* Cooldown */}
        {cooldownUntil && !cooldown.isExpired && (
          <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-garda-amber/10 border border-garda-amber/20 text-garda-amber text-[11px]">
            <Clock className="w-3.5 h-3.5" />{t('dashboard.cooldown_remaining', { minutes: Math.ceil(cooldown.totalSeconds / 60) })}
          </div>
        )}

        {/* Locked */}
        {isLocked && (
          <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-garda-pink/10 border border-garda-pink/20">
            <AlertCircle className="w-3.5 h-3.5 text-garda-pink" /><span className="text-[11px] text-garda-pink">{t('lock.cant_trade')}</span>
          </div>
        )}

        {/* Execute buttons */}
        <div className="flex gap-2 pt-1">
          <button onClick={() => handleSubmit('long')} disabled={!canTrade} className="garda-btn-long flex-1 py-2.5 text-xs">{t('trade.long_buy')}</button>
          <button onClick={() => handleSubmit('short')} disabled={!canTrade} className="garda-btn-short flex-1 py-2.5 text-xs">{t('trade.short_sell')}</button>
        </div>
      </>)}
    </div>
  );
}

/* ================================================================
   TRADE PAGE MAIN
   ================================================================ */
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

  // ---- Pause polling when tab hidden ----
  const tabVisibleRef = useRef(true);
  useEffect(() => {
    const onVis = () => { tabVisibleRef.current = !document.hidden; };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // ---- OHLCV fetch (on symbol/timeframe change only) ----
  const fetchMarketData = useCallback(async () => {
    try {
      const [tickerData, ohlcvData] = await Promise.all([
        fetchTicker(symbol), fetchOHLCV(symbol, tf, 100),
      ]);
      if (tickerData) setTicker(tickerData);
      if (ohlcvData.length > 0) setOhlcv(ohlcvData);
    } catch (err) { console.error('Fetch market data error:', err); }
    finally { setIsLoading(false); }
  }, [symbol, tf]);

  useEffect(() => {
    setIsLoading(ohlcv.length === 0);
    fetchMarketData();
  }, [symbol, tf]);

  // ---- Poll ticker (every 5s, paused when tab hidden) ----
  useEffect(() => {
    let running = true;
    const poll = async () => {
      if (!running) return;
      if (tabVisibleRef.current) {
        try { const td = await fetchTicker(symbol); if (running && td) setTicker(td); }
        catch (_) { /* ignore transient network errors */ }
      }
      setTimeout(poll, TICKER_POLL_MS);
    };
    poll();
    return () => { running = false; };
  }, [symbol]);

  // ---- Redirect if locked ----
  useEffect(() => {
    if (tradeStore.isLocked) navigate('/app/locked');
  }, [tradeStore.isLocked]);

  // ---- Active trade → chart entry line ----
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

  // ---- Handle auth expiry (401 → redirect to login) ----
  const handleAuthError = useCallback((msg: string) => {
    if (msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('token')) {
      addToast('error', 'Sesi Habis', 'Silakan login kembali.');
      setTimeout(() => { useUserStore.getState().reset(); navigate('/login'); }, 1500);
      return true;
    }
    return false;
  }, [navigate, addToast]);

  // ---- Execute ----
  const handleExecute = async (side: 'long' | 'short', data: any) => {
    setError(null); setIsSubmitting(true);
    try {
      const result = await executeTrade({ ...data, side });
      if (!result.success) {
        if (handleAuthError(result.error || '')) return;
        setError(result.error || 'Guardrail checks failed');
        addToast('error', 'Trade Gagal', result.error || '');
        return;
      }
      tradeStore.setActiveTrade(result.trade);
      tradeStore.setTradesToday(tradeStore.tradesToday + 1, phase.max_trades);
      addToast('success', 'Trade Terbuka', `${side.toUpperCase()} ${data.symbol} @ ${formatPrice(data.entryPrice)}`);
    } catch (e: any) {
      if (!handleAuthError(e.message || '')) { setError(e.message); addToast('error', 'Error', e.message); }
    } finally { setIsSubmitting(false); }
  };

  // ---- Close ----
  const handleClose = async () => {
    if (!tradeStore.activeTrade) return;
    setIsSubmitting(true); setError(null);
    try {
      const result = await closeTrade(tradeStore.activeTrade.id);
      if (result.success) {
        tradeStore.setActiveTrade(null); setPositionLines(null);
        tradeStore.setShowPostTradeModal(true, tradeStore.activeTrade.id);
        addToast(result.pnl?.isWin ? 'success' : 'info',
          result.pnl?.isWin ? 'Trade Ditutup — Win' : 'Trade Ditutup — Loss',
          `PnL: ${result.pnl?.usdt?.toFixed(2) ?? '?'} USDT · ${result.pnl?.r?.toFixed(2) ?? '?'}R`);
        if (result.lockTriggered) { tradeStore.setIsLocked(true); setTimeout(() => navigate('/app/locked'), 1500); }
        if (result.evaluationTriggered) { setTimeout(() => navigate('/app/evaluation'), 1500); }
      } else {
        setError(result.error);
      }
    } catch (e: any) {
      if (!handleAuthError(e.message || '')) setError(e.message);
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="px-4 py-4 space-y-3 pb-24">
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-1.5 max-w-[280px]">
          {toasts.map((toast) => <ToastNotification key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />)}
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('nav.trade')}</h1>
        <div className="flex items-center gap-1.5">
          <Coins className="w-3.5 h-3.5 text-garda-text-muted" />
          <span className="text-xs font-mono-num text-garda-text-secondary">{balance !== null ? formatUSDT(balance) : '...'} USDT</span>
        </div>
      </div>
      <CandlestickChart ohlcv={ohlcv} ticker={ticker} selectedTimeframe={tf} onTimeframeChange={setTf}
        isLoading={isLoading} positionLines={positionLines} />
      <OrderPanel balance={balance || 1000} ticker={ticker} maxTrades={phase.max_trades}
        tradesToday={tradeStore.tradesToday} activeTrade={tradeStore.activeTrade}
        isLocked={tradeStore.isLocked} cooldownUntil={tradeStore.cooldownUntil}
        onExecute={handleExecute} onClose={handleClose} isSubmitting={isSubmitting}
        error={error} onPositionLinesChange={setPositionLines} />
    </div>
  );
}
