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

  const [tier, setTier] = useState<number>(1);
  const [exchange, setExchange] = useState('');
  const [onboarding, setOnboarding] = useState(false);
  const [ruleOverrides, setRuleOverrides] = useState<Record<string, number | null>>({});
  const [showRules, setShowRules] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const user = !isLoading ? data?.data?.user : undefined;
  const trades = !isLoading ? (data?.data?.trades ?? []) : [];
  const stats = !isLoading ? (data?.data?.stats ?? []) : [];

  const RULE_FIELDS: { key: string; label: string; tierKey: string }[] = [
    { key: 'max_trades', label: 'Max Trades / Day', tierKey: 'max_trades' },
    { key: 'cooldown_min', label: 'Cooldown (min)', tierKey: 'cooldown_min' },
    { key: 'min_rr', label: 'Min RR', tierKey: 'min_rr' },
    { key: 'risk_per_trade_pct', label: 'Risk %', tierKey: 'risk_per_trade_pct' },
    { key: 'daily_loss_limit_r', label: 'Daily Loss Limit (R)', tierKey: 'daily_loss_limit_r' },
    { key: 'leverage', label: 'Leverage', tierKey: 'leverage' },
  ];

  const initialSync = useRef(true);
  if (user && initialSync.current) {
    initialSync.current = false;
    if (user.evaluation_tier && tier === 1) setTier(user.evaluation_tier);
    if (user.exchange && !exchange) setExchange(user.exchange);
    if (user.onboarding_completed !== undefined && onboarding === false) setOnboarding(user.onboarding_completed);
    if (user.rule_overrides && typeof user.rule_overrides === 'object') {
      const ro: Record<string, number | null> = {};
      for (const f of RULE_FIELDS) {
        if (user.rule_overrides[f.key] != null) ro[f.key] = user.rule_overrides[f.key];
      }
      setRuleOverrides(ro);
    }
  }

  const handleSave = async () => {
    setSaving(true); setMsg(null);
    try {
      // Build clean overrides object (omit nulls — they mean "use default")
      const cleanOverrides: Record<string, number> = {};
      for (const f of RULE_FIELDS) {
        const v = ruleOverrides[f.key];
        if (v != null && typeof v === 'number' && Number.isFinite(v)) {
          cleanOverrides[f.key] = v;
        }
      }
      await updateUser.mutateAsync({
        user_id: user.id,
        evaluation_tier: tier,
        rule_overrides: Object.keys(cleanOverrides).length > 0 ? cleanOverrides : undefined,
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
            <select value={tier} onChange={(e) => setTier(Number(e.target.value))}
              className="garda-input w-full py-2 text-xs">
              <option value={1}>Tier 1 — Bronze</option>
              <option value={2}>Tier 2 — Silver</option>
              <option value={3}>Tier 3 — Gold</option>
              <option value={4}>Tier 4 — Platinum</option>
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
              {onboarding ? '✓ ' + t('profile.connected') : '✗ ' + t('admin.onboarding')}
            </button>
          </div>
          <div className="flex items-end">
            <button onClick={handleSave} disabled={saving}
              className="garda-btn-primary w-full py-2 text-xs">
              {saving ? t('admin.saving') : t('admin.save')}
            </button>
          </div>
        </div>

        {/* Rule Overrides (collapsible) */}
        <div>
          <button type="button" onClick={() => setShowRules(!showRules)}
            className="flex items-center gap-2 text-xs text-garda-cyan hover:underline mb-2">
            {showRules ? '▼' : '▶'} Rule Overrides
            {Object.keys(ruleOverrides).length > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-garda-cyan/10 text-garda-cyan text-[10px] font-medium">
                {Object.keys(ruleOverrides).length} custom
              </span>
            )}
          </button>
          {showRules && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-lg bg-garda-surface/30 border border-garda-border">
              <p className="col-span-full text-[10px] text-garda-text-muted mb-1">
                Set a value to override the tier default for this trader only. Leave empty to use tier defaults.
              </p>
              {RULE_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-[10px] font-medium text-garda-text-secondary mb-1">{f.label}</label>
                  <input
                    type="number" step="any"
                    value={ruleOverrides[f.key] ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRuleOverrides(prev => ({
                        ...prev,
                        [f.key]: val === '' ? null : Number(val),
                      }));
                    }}
                    placeholder="Use tier default"
                    className="garda-input w-full py-1.5 text-xs"
                  />
                </div>
              ))}
            </div>
          )}
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
