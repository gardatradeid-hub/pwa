import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { formatUSDT } from '@/lib/formatters';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EquityPoint {
  date: string;
  balance: number;
  highWaterMark: number;
}

export function EquityCurveChart() {
  const { t } = useTranslation();
  const { profile } = useUserStore();
  const [data, setData] = useState<EquityPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');

  useEffect(() => {
    async function fetchData() {
      if (!profile?.id) return;
      try {
        const daysAgo: Record<string, number> = { '1W': 7, '1M': 30, '3M': 90, 'ALL': 365 };
        const since = new Date();
        since.setDate(since.getDate() - daysAgo[period] || 365);

        const { data: snapshots } = await supabase
          .from('equity_snapshots')
          .select('balance_usdt, high_water_mark, snapshot_at')
          .eq('user_id', profile.id)
          .gte('snapshot_at', since.toISOString())
          .order('snapshot_at', { ascending: true });

        if (snapshots) {
          const points = snapshots.map((s: any) => ({
            date: new Date(s.snapshot_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            balance: Number(s.balance_usdt),
            highWaterMark: Number(s.high_water_mark),
          }));
          setData(points);
        }
      } catch (err) {
        console.error('Fetch equity data error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [profile?.id, period]);

  const periods: Array<'1W' | '1M' | '3M' | 'ALL'> = ['1W', '1M', '3M', 'ALL'];

  const isPositive = data.length > 0 && data[data.length - 1].balance >= data[0].balance;

  if (isLoading) {
    return (
      <div className="garda-card p-6">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">{t('stats.equity_curve')}</h3>
        <div className="h-48 flex items-center justify-center">
          <p className="text-xs text-garda-text-muted">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="garda-card p-6">
        <h3 className="text-sm font-medium text-garda-text-secondary mb-4">{t('stats.equity_curve')}</h3>
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-8 h-8 text-garda-text-muted mb-2" />
          <p className="text-xs text-garda-text-muted">Belum ada data ekuitas. Mulai trading untuk melihat kurva.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="garda-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-garda-text-secondary">{t('stats.equity_curve')}</h3>
        {/* Period toggle */}
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                period === p
                  ? 'bg-garda-cyan text-[#0A0A14]'
                  : 'text-garda-text-muted hover:text-garda-text-secondary'
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositive ? '#00E5C3' : '#FF0080'} stopOpacity={0.15} />
                <stop offset="100%" stopColor={isPositive ? '#00E5C3' : '#FF0080'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              axisLine={false}
              tickLine={false}
              width={50}
              tickFormatter={(v: number) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--color-text)',
              }}
              formatter={(value: number) => [formatUSDT(value), 'Balance']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={isPositive ? '#00E5C3' : '#FF0080'}
              strokeWidth={2}
              fill="url(#equityGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
