import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminUsers } from '@/hooks/useAdmin';
import { formatDate } from '@/lib/formatters';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers(page, 20);

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search.trim()
    ? users.filter((u: any) =>
        (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.full_name || '').toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">User Management</h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garda-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari email atau nama..." className="garda-input w-full pl-9 text-sm" />
        </div>
        <span className="text-xs text-garda-text-muted">{total} total users</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-garda-text-muted">
          <Loader2 className="w-5 h-5 animate-spin" /> Memuat...
        </div>
      ) : (
        <div className="garda-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-garda-border text-garda-text-muted text-[11px] uppercase">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Exchange</th>
                  <th className="text-center px-4 py-3 font-medium">Phase</th>
                  <th className="text-center px-4 py-3 font-medium">Onboarded</th>
                  <th className="text-center px-4 py-3 font-medium">Admin</th>
                  <th className="text-right px-4 py-3 font-medium">Joined</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garda-border">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-garda-surface/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-garda-text-secondary">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {u.exchange ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-garda-cyan/10 text-garda-cyan font-mono">{u.exchange}</span>
                      ) : <span className="text-garda-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center font-mono-num">P{u.current_phase}</td>
                    <td className="px-4 py-3 text-center">
                      {u.onboarding_completed
                        ? <span className="text-garda-cyan">✓</span>
                        : <span className="text-garda-pink">✗</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_admin ? (
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-mono', u.admin_role === 'superadmin' ? 'bg-garda-amber/10 text-garda-amber' : 'bg-garda-cyan/10 text-garda-cyan')}>{u.admin_role}</span>
                      ) : <span className="text-garda-text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-garda-text-muted text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/users/${u.id}`} className="text-garda-cyan text-xs hover:underline">Detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-garda-text-muted">Halaman {page} dari {totalPages || 1}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="garda-btn-secondary py-1.5 px-3 text-xs"><ChevronLeft className="w-3.5 h-3.5" /></button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || totalPages === 0}
            className="garda-btn-secondary py-1.5 px-3 text-xs"><ChevronRight className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    </div>
  );
}
