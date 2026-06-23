import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminUser, useUpdateUser } from '@/hooks/useAdmin';
import { formatDate, formatPrice, formatUSDT } from '@/lib/formatters';
import { Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUserDetail() {
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

  // Sync state from fetched data (only when data first loads)
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
      await updateUser.mutateAsync({ user_id: user.id, current_phase: phase, exchange: exchange || undefined, onboarding_completed: onboarding });
      setMsg('Berhasil disimpan!');
    } catch (e: any) { setMsg(e.message || 'Gagal menyimpan'); }
    finally { setSaving(false); }
  };

  const wins = trades.filter((t: any) => (t.pnl_r || 0) > 0).length;
  const losses = trades.filter((t: any) => (t.pnl_r || 0) <= 0).length;

  if (isLoading) return <div className="flex items-center gap-2 py-12 justify-center text-garda-text-muted"><Loader2 className="w-5 h-5 animate-spin" />Memuat...</div>;
  if (!user) return <div className="py-12 text-center"><p className="text-garda-pink">User tidak ditemukan.</p><Link to="/admin/users" className="text-garda-cyan text-sm hover:underline mt-2 inline-block">Kembali ke daftar</Link></div>;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-garda-cyan hover:underline"><ArrowLeft className="w-3.5 h-3.5" />Kembali</Link>

      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">{user.full_name || 'User'}</h1><p className="text-sm text-garda-text-secondary">{user.email}</p></div>
        <div className="text-right text-xs text-garda-text-muted">Member since {formatDate(user.created_at)}</div>
      </div>

      {/* Edit */}
      <div className="garda-card p-4 space-y-3">
        <h2 className="font-semibold text-sm">Edit User</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1">Phase</label>
            <select value={phase} onChange={(e) => setPhase(Number(e.target.value))} className="garda-input w-full py-2 text-xs">
              <option value={1}>Phase 1</option>
              <option value={2}>Phase 2</option>
              <option value={3}>Phase 3</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1">Exchange</label>
            <input type="text" value={exchange} onChange={(e) => setExchange(e.target.value)} className="garda-input w-full py-2 text-xs" placeholder="bybit, binance, gate..." />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-garda-text-secondary mb-1">Onboarding</label>
            <button onClick={() => setOnboarding(!onboarding)} className={cn('w-full py-2 rounded-lg text-xs font-medium border transition-colors', onboarding ? 'bg-garda-cyan/10 border-garda-cyan text-garda-cyan' : 'border-garda-border text-garda-text-secondary')}>
              {onboarding ? '✓ Completed' : '✗ Not completed'}
            </button>
          </div>
          <div className="flex items-end">
            <button onClick={handleSave} disabled={saving} className="garda-btn-primary w-full py-2 text-xs">{saving ? 'Menyimpan...' : 'Simpan'}</button>
          </div>
        </div>
        {msg && <p className={cn('text-xs', msg.includes('Berhasil') ? 'text-garda-cyan' : 'text-garda-pink')}>{msg}</p>}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="garda-card p-3"><p className="text-xs text-garda-text-muted">Total Trades</p><p className="text-lg font-bold font-mono-num">{trades.length}</p></div>
        <div className="garda-card p-3"><p className="text-xs text-garda-text-muted">Wins</p><p className="text-lg font-bold font-mono-num text-garda-cyan">{wins}</p></div>
        <div className="garda-card p-3"><p className="text-xs text-garda-text-muted">Losses</p><p className="text-lg font-bold font-mono-num text-garda-pink">{losses}</p></div>
        <div className="garda-card p-3"><p className="text-xs text-garda-text-muted">Win Rate</p><p className="text-lg font-bold font-mono-num">{trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : '0'}%</p></div>
      </div>

      {/* Recent trades */}
      <div>
        <h2 className="font-semibold text-sm mb-2">Recent Trades ({trades.length})</h2>
        {trades.length === 0 ? (
          <p className="text-xs text-garda-text-muted">Belum ada trade.</p>
        ) : (
          <div className="garda-card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-garda-border text-garda-text-muted">
                <th className="text-left px-3 py-2 font-medium">Pair</th><th className="text-left px-3 py-2 font-medium">Side</th>
                <th className="text-right px-3 py-2 font-medium">Entry</th><th className="text-right px-3 py-2 font-medium">Exit</th>
                <th className="text-right px-3 py-2 font-medium">PnL</th><th className="text-right px-3 py-2 font-medium">Date</th>
              </tr></thead>
              <tbody className="divide-y divide-garda-border">
                {trades.slice(0, 20).map((t: any) => (
                  <tr key={t.id}>
                    <td className="px-3 py-2 font-mono-num">{t.symbol}</td>
                    <td className="px-3 py-2"><span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono', t.side === 'long' ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-pink/10 text-garda-pink')}>{t.side}</span></td>
                    <td className="px-3 py-2 text-right font-mono-num">{formatPrice(t.entry_price)}</td>
                    <td className="px-3 py-2 text-right font-mono-num">{t.exit_price ? formatPrice(t.exit_price) : '—'}</td>
                    <td className={cn('px-3 py-2 text-right font-mono-num font-medium', (t.pnl_usdt || 0) >= 0 ? 'text-garda-cyan' : 'text-garda-pink')}>{t.pnl_usdt?.toFixed(2) ?? '—'} USDT</td>
                    <td className="px-3 py-2 text-right text-garda-text-muted">{new Date(t.opened_at).toLocaleDateString()}</td>
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
