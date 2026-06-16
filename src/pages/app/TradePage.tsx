import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  ChevronDown,
} from 'lucide-react';

// =====================================================
// MINI CANDLESTICK CHART (lightweight-charts wrapper)
// =====================================================
function CandlestickChart({ data, ticker }: { data: OHLCVData[]; ticker: TickerData | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('15m');

  const timeframes = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
  ];

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
          <div className="text-xs text-garda-text-muted font-mono-num">
            H: {formatPrice(ticker.high)} L: {formatPrice(ticker.low)}
          </div>
        </div>
      )}

      {/* Timeframe selector */}
      <div className="flex gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf.value}
            onClick={() => setSelectedTimeframe(tf.value)}
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
      <div
        ref={containerRef}
        className="w-full h-[280px] rounded-xl border border-garda-border bg-garda-surface flex items-center justify-center"
      >
        {data.length === 0 ? (
          <div className="text-center">
            <Clock className="w-8 h-8 text-garda-text-muted mx-auto mb-2 animate-pulse-glow" />
            <p className="text-xs text-garda-text-muted">Memuat chart...</p>
          </div>
        ) : (
          <div className="w-full h-full relative">
            {/* Simple OHLCV visualizer (lightweight-charts will replace this in Sprint 3) */}
            <div className="absolute inset-0 flex items-end gap-[2px] px-2 pb-2">
              {data.slice(-50).map((candle, i) => {
                const maxH = 250;
                const maxPrice = Math.max(...data.slice(-50).map(c => c.high));
                const minPrice = Math.min(...data.slice(-50).map(c => c.low));
                const range = maxPrice - minPrice || 1;
                const h = ((candle.close - minPrice) / range) * maxH;
                const isGreen = candle.close >= candle.open;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end"
                    style={{ height: `${h}px` }}
                  >
                    <div
                      className={cn(
                        'w-full rounded-[1px]',
                        isGreen ? 'bg-garda-cyan' : 'bg-garda-pink'
                      )}
                      style={{
                        height: `${Math.max(1, Math.abs(candle.close - candle.open) / range * maxH)}px`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Volume info */}
      {ticker && (
        <div className="flex justify-between text-xs text-garda-text-muted">
          <span>Vol: {ticker.volume?.toLocaleString()}</span>
          <span>Spread: {formatPrice((ticker.ask || 0) - (ticker.bid || 0))}</span>
        </div>
      )}
    </div>
  );
}

// =====================================================
// ORDER PANEL
// =====================================================
interface OrderFormState {
  symbol: string;
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  entryPrice: string;
  stopLoss: string;
  rrRatio: number;
}

const SUPPORTED_SYMBOLS = ['BTC/USDT', 'ETH/USDT', 'XRP/USDT', 'SOL/USDT', 'BNB/USDT'];
const RR_OPTIONS = [2, 3, 5];

function OrderPanel({ balance, ticker, maxTrades }: { balance: number; ticker: TickerData | null; maxTrades: number }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { form, setSymbol, setSide, setEntryPrice, setStopLoss } = useTradeStore();
  const { tradesToday, activeTrade, isLocked, cooldownUntil } = useTradeStore();
  const cooldown = useTimer(cooldownUntil);
  const { profile } = useUserStore();

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
      passed: true, // Will be checked server-side
      icon: TrendingDown,
    },
  ];

  const canTrade = !isLocked && !cooldownUntil && !activeTrade && tradesToday < maxTrades && !isSubmitting;

  const handleSubmit = async () => {
    if (!canTrade || !position || entryPrice <= 0 || stopLoss <= 0) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await executeTrade({
        symbol: form.symbol,
        side: form.side,
        entryPrice,
        stopLoss,
        rrRatio,
      });

      if (!result.success) {
        setError(result.error || 'Guardrail checks failed');
        return;
      }

      // Navigate or show success
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
        // Check lock
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
            onClick={handleSubmit}
            disabled={!canTrade}
            className="garda-btn-long flex-1"
          >
            {t('trade.long_buy')}
          </button>
          <button
            onClick={handleSubmit}
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
          <LockIcon className="w-4 h-4 text-garda-pink" />
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

function LockIcon({ className }: { className?: string }) {
  return <AlertCircle className={className} />;
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

  // Fetch market data
  useEffect(() => {
    let mounted = true;

    async function loadMarketData() {
      try {
        const [tickerData, ohlcvData] = await Promise.all([
          fetchTicker(form.symbol),
          fetchOHLCV(form.symbol, '15m', 100),
        ]);

        if (!mounted) return;

        if (tickerData) {
          setTicker(tickerData);
          // Auto-fill entry price if empty
          if (!form.entryPrice) {
            setEntryPrice(tickerData.last);
          }
        }
        if (ohlcvData.length > 0) {
          setOhlcv(ohlcvData);
        }
      } catch (err) {
        console.error('Fetch market data error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadMarketData();

    // Poll ticker every 5s
    const poll = setInterval(async () => {
      const td = await fetchTicker(form.symbol);
      if (td && mounted) setTicker(td);
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(poll);
    };
  }, [form.symbol]);

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
      <CandlestickChart data={ohlcv} ticker={ticker} />

      {/* Order Panel */}
      <OrderPanel balance={balance || 1000} ticker={ticker} maxTrades={phase.max_trades} />
    </div>
  );
}
