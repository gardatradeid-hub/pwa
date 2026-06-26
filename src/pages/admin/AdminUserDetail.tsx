import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminUser, useUpdateUser } from '@/hooks/useAdmin';
import { formatDate, formatPrice } from '@/lib/formatters';
import { Loader2, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { data, isLoading } = useAdminUser(userId || null);
  const updateUser = useUpdateUser();

  const [phase, setPhase] = useState<number>(1);
  const [exchange, setExchange] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const user = !isLoading ? data?.data?.user : undefined;
  const trades = !isLoading ? (data?.data?.trades ?? []) : [];
  const stats = !isLoading ? (data?.data?.stats ?? []) : [];

  const initialSync = useRef(true);
  if (user && initialSync.current) {
    initialSync.current = false;
    if (user.current_phase && phase === 1) setPhase(user.current_phase);
    if (user.exchange && !exchange) setExchange(user.exchange);
    if (user.onboarding_completed !== undefined && onboarding === false) setOnboarding(user.onboarding_completed);
  }

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      await updateUser.mutateAsync({
        user_id: user.id,
        current_phase: phase,
        exchange: exchange || undefined,
        onboarding_completed: onboarding,
      });
      setMsg(t('admin.saved'));
    } catch (e: any) { setMsg(e.message || t('common.error')); }
    finally { setSaving(false); }
  };

  if (isLoading) return (
    <div className="flex items-center gap-2 py-16 justify-center text-garda-text-muted text-xs">
      <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
    </div>
  );
  if (!user) return (
    <div className="garda-card p-8 text-center">
      <p className="text-garda-pink mb-2">{t('admin.user_not_found')}</p>
      <Link to="/admin/users" className="text-garda-cyan text-xs hover:underline">{t('admin.back_to_users')}</Link>
    </div>
  );

  const wins = trades.filter((t: any) => (t.pnl_r || 0) > 0).length;
  const losses = trades.filter((t: any) => (t.pnl_r || 0) <= 0).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-xs text-garda-cyan hover:underline">
        <ArrowLeft className="w-3.5 h-3.5" />{t('admin.back_to_users')}
      </Link>

      {/* User header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{user.full_name || 'User'}</h1>
          <p className="text-sm text-garda-text-secondary">{user.email}</p>
        </div>
        <span className="text-xs text-garda-text-muted">
          {t('admin.member_since')}: {formatDate(user.created_at)}
        </span>
      </div>

      {/* Edit card */}
      <div className="garda-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">{t('admin.edit_user')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1.5">{t('admin.phase')}</label>
            <select value={phase} onChange={(e) => setPhase(Number(e.target.value))}
              className="garda-input w-full py-2 text-xs">
              <option value={1}>Phase 1 — Pemula</option>
              <option value={2}>Phase 2 — Terlatih</option>
              <option value={3}>Phase 3 — Professional</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1.5">{t('admin.exchange')}</label>
            <input type="text" value={exchange} onChange={(e) => setExchange(e.target.value)}
              className="garda-input w-full py-2 text-xs" placeholder="bybit, binance, gate..." />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1.5">{t('admin.onboarding')}</label>
            <button onClick={() => setOnboarding(!onboarding)}
              className={cn(
                'w-full py-2 rounded-lg text-xs font-medium border transition-colors',
                onboarding
                  ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan'
                  : 'border-garda-border text-garda-text-secondary',
              )}>
              {onboarding ? '✓ Completed' : '✗ Not Completed'}
            </button>
          </div>
          <div className="flex items-end">
            <button onClick={handleSave} disabled={saving}
              className="garda-btn-primary w-full py-2 text-xs">
              {saving ? t('admin.saving') : t('admin.save')}
            </button>
          </div>
        </div>
        {msg && (
          <p className={cn('text-xs', msg === t('admin.saved') ? 'text-garda-cyan' : 'text-garda-pink')}>{msg}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label={t('admin.total_trades')} value={trades.length} />
        <StatCard label={t('admin.wins')} value={wins} color="text-garda-cyan" />
        <StatCard label={t('admin.losses')} value={losses} color="text-garda-pink" />
        <StatCard label={t('admin.win_rate')} value={trades.length > 0 ? `${((wins / trades.length) * 100).toFixed(0)}%` : '0%'} />
      </div>

      {/* Trades */}
      <div>
        <h2 className="font-semibold text-sm mb-3">{t('admin.recent_trades')} ({trades.length})</h2>
        {trades.length === 0 ? (
          <div className="garda-card p-6 text-center text-xs text-garda-text-muted">{t('admin.no_trades')}</div>
        ) : (
          <div className="garda-card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-garda-border text-garda-text-muted">
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_pair')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_side')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('admin.col_entry')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('admin.col_exit')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('admin.col_pnl')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('admin.col_date')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garda-border">
                {trades.slice(0, 20).map((t: any) => (
                  <tr key={t.id} className="hover:bg-garda-surface/30">
                    <td className="px-3 py-2.5 font-mono-num">{t.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono-num',
                        t.side === 'long' ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-pink/10 text-garda-pink',
                      )}>{t.side}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{formatPrice(t.entry_price)}</td>
                    <td className="px-3 py-2.5 text-right font-mono-num">{t.exit_price ? formatPrice(t.exit_price) : '—'}</td>
                    <td className={cn('px-3 py-2.5 text-right font-mono-num font-medium',
                      (t.pnl_usdt || 0) >= 0 ? 'text-garda-cyan' : 'text-garda-pink',
                    )}>{t.pnl_usdt?.toFixed(2) ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right text-garda-text-muted">{new Date(t.opened_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="garda-card p-4 space-y-1">
      <p className="text-[11px] text-garda-text-muted">{label}</p>
      <p className={cn('text-xl font-bold font-mono-num', color || 'text-garda-text')}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  );
}
