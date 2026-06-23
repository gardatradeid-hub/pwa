import { useState } from 'react';
import { useAdminLogs } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/formatters';
import { Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading } = useAdminLogs(page, 50);

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50);

  let filtered = logs;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l: any) =>
      (l.user_email || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.function_name || '').toLowerCase().includes(q)
    );
  }
  if (actionFilter) {
    filtered = filtered.filter((l: any) => l.action === actionFilter);
  }

  const uniqueActions = [...new Set(logs.map((l: any) => l.action))];
  const statusColor = (s: number) => s < 400 ? 'text-garda-cyan' : s < 500 ? 'text-garda-amber' : 'text-garda-pink';
  const statusBg = (s: number) => s < 400 ? 'bg-garda-cyan/10' : s < 500 ? 'bg-garda-amber/10' : 'bg-garda-pink/10';

  return (
    <div className="space-y-4 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <span className="text-xs text-garda-text-muted">{total} total logs</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-garda-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari user, action..." className="garda-input w-full pl-9 text-sm" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="garda-input text-sm max-w-[180px]">
          <option value="">All Actions</option>
          {uniqueActions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => { setActionFilter(''); setSearch(''); setPage(1); }}
          className="text-xs text-garda-text-muted hover:text-garda-text-secondary">Clear filters</button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-garda-text-muted"><Loader2 className="w-5 h-5 animate-spin" />Memuat...</div>
      ) : (
        <div className="garda-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-garda-border text-garda-text-muted">
                  <th className="text-left px-3 py-2.5 font-medium">Time</th>
                  <th className="text-left px-3 py-2.5 font-medium">Status</th>
                  <th className="text-left px-3 py-2.5 font-medium">Function</th>
                  <th className="text-left px-3 py-2.5 font-medium">Action</th>
                  <th className="text-left px-3 py-2.5 font-medium">User</th>
                  <th className="text-left px-3 py-2.5 font-medium">Request</th>
                  <th className="text-left px-3 py-2.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garda-border">
                {filtered.map((log: any) => (
                  <tr key={log.id} className="hover:bg-garda-surface/50">
                    <td className="px-3 py-2.5 whitespace-nowrap text-garda-text-muted font-mono-num">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={cn('px-1.5 py-0.5 rounded font-mono-num', statusBg(log.response_status || 0), statusColor(log.response_status || 0))}>
                        {log.response_status || '?'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono-num">{log.function_name}</td>
                    <td className="px-3 py-2.5">{log.action}</td>
                    <td className="px-3 py-2.5 text-garda-text-secondary">{log.user_email || '—'}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-garda-text-muted">{JSON.stringify(log.request_body)}</td>
                    <td className="px-3 py-2.5 max-w-[200px] truncate text-garda-pink">{log.error_message || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
