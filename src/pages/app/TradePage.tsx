import { useState, useEffect, useRef, useCallback } from 'react';
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
import { calculatePositionSize } from '@/lib/position-sizer';
import { formatUSDT, formatPrice, formatR } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { OHLCVData, TickerData } from '@/types/exchange';
import {
  ArrowUp, ArrowDown, Clock, AlertCircle, CheckCircle2,
  XCircle, Shield, TrendingUp, TrendingDown, Target, Coins,
  ChevronDown, Loader2,
} from 'lucide-react';

// =====================================================
// CANDLESTICK CHART (lightweight-charts — Bybit style)
// =====================================================

const TIMEFRAMES = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
] as const;

const REFETCH_INTERVALS: Record<string, number> = {
  '1m': 5_000,
  '5m': 10_000,
  '15m': 15_000,
  '30m': 20_000,
  '1h': 30_000,
  '4h': 60_000,
};

// Warna ala Bybit dark terminal
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

interface CandlestickChartProps {
  ohlcv: OHLCVData[];
  ticker: TickerData | null;
  selectedTimeframe: string;
  onTimeframeChange: (tf: string) => void;
  isLoading: boolean;
}

function CandlestickChart({ ohlcv, ticker, selectedTimeframe, onTimeframeChange, isLoading }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Init / resize chart
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
        mode: 0, // normal crosshair
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
        chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
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

  // Update data when ohlcv changes
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
                : 'text-garda-text-muted hover:text-garda-text-secondary'
            )}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="relative w-full h-[340px] rounded-xl border border-garda-border overflow-hidden bg-garda-bg">
        {isLoading && ohlcv.length === 0 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-garda-bg/80">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-garda-cyan mx-auto mb-2 animate-spin" />
              <p className="text-xs text-garda-text-muted">Memuat chart...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
        <div ref={tooltipRef} className="absolute top-2 left-2 pointer-events-none" />
      </div>

      {/* Spread info */}
      {ticker && (
        <div className="flex justify-between text-xs text-garda-text-muted">
          <span>Bid: {formatPrice(ticker.bid ?? 0)}</span>
          <span>Ask: {formatPrice(ticker.ask ?? 0)}</span>
          <span>Spread: {formatPrice((ticker.ask ?? 0) - (ticker.bid ?? 0))}</span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// ORDER PANEL
// =====================================================

const SUPPORTED_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'BNB/USDT'];
const RR_OPTIONS = [2, 3, 5];

function OrderPanel({ balance, ticker, maxTrades }: { balance: number; ticker: TickerData | null; maxTrades: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { form, setSymbol, setSide, setEntryPrice, setStopLoss } = useTradeStore();
  const { tradesToday, activeTrade, isLocked, cooldownUntil } = useTradeStore();
  const cooldown = useTimer(cooldownUntil);

  const [rrRatio, setRrRatio] = useState(2);
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSymbolPicker, setShowSymbolPicker] = useState(false);

  const entryPrice = form.entryPrice || ticker?.last || 0;
  const stopLoss = form.stopLoss || 0;

  // Calculate position
  const position = entryPrice > 0 && stopLoss > 0 && balance > 0
    ? calculatePositionSize(
        {
          symbol: form.symbol,
          side: form.side,
          orderType,
          entryPrice,
          stopLoss,
          rrRatio,
        },
        balance
      )
    : null;

  // Guardrail checks for UI display
  const checks = [
    {
      label: t('trade.risk_limit'),
      passed: position ? position.riskAmount <= balance * 0.01 : true,
      icon: Shield,
    },
    {
      label: t('dashboard.daily_activity'),
      passed: tradesToday < maxTrades,
      icon: Target,
    },
    {
      label: t('dashboard.daily_loss'),
      passed: true,
      icon: TrendingDown,
    },
  ];

  const canTrade =
    !isLocked &&
    (cooldown?.isExpired ?? true) &&
    !activeTrade &&
    tradesToday < maxTrades &&
    !isSubmitting &&
    entryPrice > 0 &&
    stopLoss > 0;

  const handleSubmit = async (side: 'long' | 'short') => {
    if (!position || position.quantity <= 0) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await executeTrade({
        symbol: form.symbol,
        side,
        entryPrice,
        stopLoss,
        rrRatio,
      });

      if (!result.success) {
        setError(result.error || 'Guardrail checks failed');
        return;
      }

      useTradeStore.getState().setActiveTrade(result.trade);
      useTradeStore.getState().setTradesToday(tradesToday + 1, maxTrades);
    } catch (e: any) {
      setError(e.message || 'Gagal eksekusi trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseTrade = async () => {
    if (!activeTrade) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await closeTrade(activeTrade.id);
      if (result.success) {
        useTradeStore.getState().setActiveTrade(null);
        useTradeStore.getState().setShowPostTradeModal(true, activeTrade.id);
        if (result.lockTriggered) {
          useTradeStore.getState().setIsLocked(true);
          useTradeStore.getState().setCooldownUntil(result.lockTriggered.unlocksAt);
          navigate('/app/locked');
        }
        if (result.evaluationTriggered) {
          navigate('/app/evaluation');
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
    <div className="space-y-4">
      {/* Symbol picker */}
      <div className="relative">
        <button
          onClick={() => setShowSymbolPicker(!showSymbolPicker)}
          className="garda-input w-full flex items-center justify-between text-left"
        >
          <span className="font-mono-num font-medium">{form.symbol}</span>
          <ChevronDown className={cn('w-4 h-4 text-garda-text-muted transition-transform', showSymbolPicker && 'rotate-180')} />
        </button>
        {showSymbolPicker && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-garda-card border border-garda-border rounded-lg z-10 shadow-lg">
            {SUPPORTED_SYMBOLS.map((sym) => (
              <button
                key={sym}
                onClick={() => { setSymbol(sym); setShowSymbolPicker(false); }}
                className={cn(
                  'w-full px-4 py-2.5 text-left font-mono-num text-sm hover:bg-garda-surface transition-colors',
                  sym === form.symbol ? 'text-garda-cyan' : 'text-garda-text-secondary'
                )}
              >
                {sym}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Side selector */}
      <div className="flex gap-3">
        <button
          onClick={() => setSide('long')}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all',
            form.side === 'long'
              ? 'bg-garda-cyan text-[#0A0A14]'
              : 'border border-garda-border text-garda-text-secondary hover:border-garda-cyan/50'
          )}
        >
          <ArrowUp className="w-4 h-4" /> {t('trade.long_buy')}
        </button>
        <button
          onClick={() => setSide('short')}
          className={cn(
            'flex-1 py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all',
            form.side === 'short'
              ? 'bg-garda-pink text-white'
              : 'border border-garda-border text-garda-text-secondary hover:border-garda-pink/50'
          )}
        >
          <ArrowDown className="w-4 h-4" /> {t('trade.short_sell')}
        </button>
      </div>

      {/* Order type toggle */}
      <div className="flex bg-garda-input rounded-lg p-1">
        {(['market', 'limit'] as const).map((ot) => (
          <button
            key={ot}
            onClick={() => setOrderType(ot)}
            className={cn(
              'flex-1 py-2 text-xs font-medium rounded-md transition-colors',
              orderType === ot ? 'bg-garda-cyan text-[#0A0A14]' : 'text-garda-text-secondary'
            )}
          >
            {t(`trade.${ot}`)}
          </button>
        ))}
      </div>

      {/* Entry Price */}
      <div>
        <label className="block text-xs font-medium text-garda-text-secondary mb-1.5">
          {orderType === 'market' ? t('trade.market_price') : t('trade.order_price')}
        </label>
        <input
          type="number"
          value={form.entryPrice || ''}
          onChange={(e) => setEntryPrice(e.target.value ? Number(e.target.value) : null)}
          placeholder={ticker ? formatPrice(ticker.last) : '0.00'}
          className="garda-input w-full font-mono-num"
        />
        {ticker && (
          <button
            onClick={() => setEntryPrice(ticker.last)}
            className="text-xs text-garda-cyan mt-1 hover:underline"
          >
            {t('trade.last_price')}: {formatPrice(ticker.last)}
          </button>
        )}
      </div>

      {/* Stop Loss */}
      <div>
        <label className="block text-xs font-medium text-garda-text-secondary mb-1.5">
          {t('trade.sl_auto')}
        </label>
        <input
          type="number"
          value={form.stopLoss || ''}
          onChange={(e) => setStopLoss(e.target.value ? Number(e.target.value) : null)}
          placeholder="0.00"
          className="garda-input w-full font-mono-num text-garda-pink"
        />
      </div>

      {/* RR Ratio selector */}
      <div>
        <label className="block text-xs font-medium text-garda-text-secondary mb-1.5">
          {t('trade.rr_ratio')}
        </label>
        <div className="flex gap-2">
          {RR_OPTIONS.map((rr) => (
            <button
              key={rr}
              onClick={() => setRrRatio(rr)}
              className={cn(
                'flex-1 py-2 rounded-lg text-sm font-mono-num font-medium border transition-colors',
                rrRatio === rr
                  ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan'
                  : 'border-garda-border text-garda-text-secondary'
              )}
            >
              1:{rr}
            </button>
          ))}
        </div>
      </div>

      {/* Position Details */}
      {position && position.quantity > 0 && (
        <div className="garda-card p-4 space-y-2 bg-garda-surface/50">
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.qty')}</span>
            <span className="font-mono-num font-medium">{position.quantity.toFixed(4)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.margin')}</span>
            <span className="font-mono-num font-medium">{formatUSDT(position.margin)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.take_profit')}</span>
            <span className="font-mono-num font-medium text-garda-cyan">{formatPrice(position.takeProfit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.risk')}</span>
            <span className="font-mono-num font-medium text-garda-pink">{formatUSDT(position.riskAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.potential_profit')}</span>
            <span className="font-mono-num font-medium text-garda-cyan">{formatUSDT(position.potentialProfit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-garda-text-muted">{t('trade.leverage')}</span>
            <span className="font-mono-num font-medium text-garda-amber">{t('trade.leverage_locked')}</span>
          </div>
        </div>
      )}

      {/* Guardrail status */}
      <div className="space-y-1.5">
        {checks.map((check, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            {check.passed ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-garda-cyan" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-garda-pink" />
            )}
            <span className={check.passed ? 'text-garda-text-muted' : 'text-garda-pink'}>
              {check.label}
            </span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20 text-garda-pink text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Cooldown banner */}
      {cooldownUntil && !cooldown.isExpired && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-amber/10 border border-garda-amber/20 text-garda-amber text-sm">
          <Clock className="w-4 h-4" />
          {t('dashboard.cooldown_remaining', { minutes: Math.ceil(cooldown.totalSeconds / 60) })}
        </div>
      )}

      {/* Active trade card */}
      {activeTrade ? (
        <div className="garda-card p-4 border-garda-cyan/30 space-y-3">
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
                {t('active_trade.entry')}: {formatUSDT(activeTrade.entry_price)}
              </p>
              <p className="text-xs font-mono-num text-garda-text-muted">
                SL: {formatUSDT(activeTrade.stop_loss)} TP: {formatUSDT(activeTrade.take_profit)}
              </p>
            </div>
          </div>

          <button
            onClick={handleCloseTrade}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-garda-pink/10 border border-garda-pink/30 text-garda-pink font-semibold text-sm hover:bg-garda-pink/20 transition-colors"
          >
            {isSubmitting ? t('common.loading') : t('active_trade.close_trade')}
          </button>
        </div>
      ) : (
        /* Execute buttons */
        <div className="flex gap-3">
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
      )}

      {/* Locked notice */}
      {isLocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-garda-pink/10 border border-garda-pink/20">
          <AlertCircle className="w-4 h-4 text-garda-pink" />
          <span className="text-sm text-garda-pink">{t('lock.cant_trade')}</span>
        </div>
      )}

      {/* Trades remaining */}
      <p className="text-xs text-garda-text-muted text-center">
        {t('trade.trades_usage', { used: tradesToday, max: maxTrades })}
      </p>
    </div>
  );
}

// =====================================================
// TRADE PAGE MAIN
// =====================================================
export default function TradePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, balance, setBalance } = useUserStore();
  const { form, setEntryPrice, setStopLoss, ticker, ohlcv, setTicker, setOhlcv, isLocked } = useTradeStore();
  const phase = useUserStore.getState().getCurrentPhase();
  const [isLoading, setIsLoading] = useState(true);
  const [tf, setTf] = useState('15m');

  // Fetch OHLCV based on symbol + timeframe
  const fetchMarketData = useCallback(async () => {
    try {
      const [tickerData, ohlcvData] = await Promise.all([
        fetchTicker(form.symbol),
        fetchOHLCV(form.symbol, tf, 100),
      ]);

      if (tickerData) {
        setTicker(tickerData);
        if (!form.entryPrice) setEntryPrice(tickerData.last);
      }
      if (ohlcvData.length > 0) setOhlcv(ohlcvData);
    } catch (err) {
      console.error('Fetch market data error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [form.symbol, tf]);

  // Initial fetch + refetch on symbol/timeframe change
  useEffect(() => {
    setIsLoading(ohlcv.length === 0);
    fetchMarketData();
  }, [form.symbol, tf]);

  // Poll ticker based on timeframe
  useEffect(() => {
    const interval = REFETCH_INTERVALS[tf] ?? 15_000;
    const poll = setInterval(async () => {
      const td = await fetchTicker(form.symbol);
      if (td) setTicker(td);
    }, interval);

    return () => clearInterval(poll);
  }, [form.symbol, tf]);

  // Redirect if locked
  useEffect(() => {
    if (isLocked) navigate('/app/locked');
  }, [isLocked]);

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('nav.trade')}</h1>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-garda-text-muted" />
          <span className="text-sm font-mono-num text-garda-text-secondary">
            {balance !== null ? formatUSDT(balance) : '...'}
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
      />

      {/* Order Panel */}
      <OrderPanel balance={balance || 1000} ticker={ticker} maxTrades={phase.max_trades} />
    </div>
  );
}
