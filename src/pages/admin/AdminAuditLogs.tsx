import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAdminLogs } from '@/hooks/useAdmin';
import { Loader2, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const ACTIONS = ['execute_trade', 'close_trade', 'connect_exchange', 'get_ticker', 'get_ohlcv', 'get_balance', 'admin_list_users', 'admin_update_user', 'admin_get_logs', 'admin_update_config'];

export default function AdminAuditLogs() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const { data, isLoading } = useAdminLogs(page, 50);

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  let filtered = logs;
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((l: any) =>
      (l.user_email || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q),
    );
  }
  if (actionFilter) filtered = filtered.filter((l: any) => l.action === actionFilter);

  const statusBg = (s: number) => s === 0 ? 'bg-garda-amber/10' : s < 400 ? 'bg-garda-cyan/10' : 'bg-garda-pink/10';
  const statusColor = (s: number) => s === 0 ? 'text-garda-amber' : s < 400 ? 'text-garda-cyan' : 'text-garda-pink';

  return (
    <div className="space-y-4 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold">{t('admin.logs_title')}</h1>
        <p className="text-xs text-garda-text-muted mt-1">{t('admin.logs_count', { total })}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-garda-text-muted" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('admin.search_logs')}
            className="garda-input w-full pl-9 py-2 text-xs" />
        </div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="garda-input py-2 text-xs">
          <option value="">{t('admin.all_actions')}</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-garda-text-muted text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="garda-card p-8 text-center">
          <p className="text-xs text-garda-text-muted">{t('admin.no_logs')}</p>
        </div>
      ) : (
        <>
          <div className="garda-card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-garda-border text-garda-text-muted">
                    <th className="text-left px-3 py-2.5 font-medium whitespace-nowrap">{t('admin.col_time')}</th>
                    <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_status')}</th>
                    <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_function')}</th>
                    <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_action')}</th>
                    <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_user')}</th>
                    <th className="text-left px-3 py-2.5 font-medium max-w-[300px]">{t('admin.col_error')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-garda-border">
                  {filtered.map((log: any) => (
                    <tr key={log.id} className="hover:bg-garda-surface/30">
                      <td className="px-3 py-2.5 whitespace-nowrap text-garda-text-muted font-mono-num">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono-num', statusBg(log.response_status || 0), statusColor(log.response_status || 0))}>
                          {log.response_status || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono-num text-[11px] text-garda-text-secondary">{log.function_name}</td>
                      <td className="px-3 py-2.5">{log.action}</td>
                      <td className="px-3 py-2.5 text-garda-text-secondary">{log.user_email || '—'}</td>
                      <td className="px-3 py-2.5 max-w-[500px] break-words text-garda-pink">
                        {log.error_message || <span className="text-garda-text-muted">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-garda-text-muted">
              {t('admin.page_info', { page, total: totalPages })}
            </span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="garda-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" />{t('admin.prev')}
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="garda-btn-secondary py-1.5 px-3 text-xs flex items-center gap-1">
                {t('admin.next')}<ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
