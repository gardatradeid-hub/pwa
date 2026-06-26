import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAdminUsers } from '@/hooks/useAdmin';
import { formatDate } from '@/lib/formatters';
import { Loader2, Search, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useAdminUsers(page, 20);

  const users = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const filtered = search.trim()
    ? users.filter((u: any) =>
        ((u.email || '') + (u.full_name || '')).toLowerCase().includes(search.toLowerCase()),
      )
    : users;

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold">{t('admin.users_title')}</h1>
        <p className="text-xs text-garda-text-muted mt-1">{t('admin.users_count', { total })}</p>
      </div>

      {/* Search */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-garda-text-muted" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.search_users')}
            className="garda-input w-full pl-9 py-2 text-xs" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 justify-center text-garda-text-muted text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
        </div>
      ) : filtered.length === 0 ? (
        <div className="garda-card p-8 text-center">
          <Users className="w-8 h-8 text-garda-text-muted mx-auto mb-2" />
          <p className="text-xs text-garda-text-muted">{search ? t('admin.no_users_found') : t('admin.no_users')}</p>
        </div>
      ) : (
        <>
          <div className="garda-card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-garda-border text-garda-text-muted">
                  <th className="text-left px-4 py-3 font-medium">{t('admin.col_name')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('admin.col_email')}</th>
                  <th className="text-left px-4 py-3 font-medium">{t('admin.col_exchange')}</th>
                  <th className="text-center px-4 py-3 font-medium">{t('admin.col_phase')}</th>
                  <th className="text-center px-4 py-3 font-medium">{t('admin.col_joined')}</th>
                  <th className="text-right px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garda-border">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-garda-surface/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                    <td className="px-4 py-3 text-garda-text-secondary">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {u.exchange ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-mono-num bg-garda-cyan/10 text-garda-cyan border border-garda-cyan/20">
                          {u.exchange}
                        </span>
                      ) : (
                        <span className="text-garda-text-muted text-[10px]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-num bg-garda-surface text-garda-text-secondary">
                        P{u.current_phase}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-garda-text-muted font-mono-num">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/admin/users/${u.id}`}
                        className="text-garda-cyan hover:underline text-[11px] font-medium">
                        {t('admin.detail')} →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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
