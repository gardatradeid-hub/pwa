import { useTranslation } from 'react-i18next';
import { useAdminUsers } from '@/hooks/useAdmin';
import { useAdminLogs } from '@/hooks/useAdmin';
import { Loader2, Users, Activity, TrendingUp, TrendingDown, ArrowUpRight, ShieldCheck } from 'lucide-react';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(1, 1);
  const { data: logsData, isLoading: logsLoading } = useAdminLogs(1, 20);

  const totalUsers = usersData?.total ?? 0;
  const totalLogs = logsData?.total ?? 0;
  const latestLogs = logsData?.data ?? [];

  const actions = latestLogs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.action] = (acc[l.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      icon: Users, label: t('admin.stat_total_users'), value: usersLoading ? '...' : String(totalUsers),
      color: 'text-garda-cyan', bg: 'bg-garda-cyan/5',
    },
    {
      icon: Activity, label: t('admin.stat_api_calls'), value: logsLoading ? '...' : String(totalLogs),
      color: 'text-garda-amber', bg: 'bg-garda-amber/5',
    },
    {
      icon: TrendingUp, label: t('admin.stat_trades_exe'), value: String(actions['execute_trade'] || 0),
      color: 'text-garda-cyan', bg: 'bg-garda-cyan/5',
    },
    {
      icon: TrendingDown, label: t('admin.stat_trades_closed'), value: String(actions['close_trade'] || 0),
      color: 'text-garda-pink', bg: 'bg-garda-pink/5',
    },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold">{t('admin.dashboard_title')}</h1>
        <p className="text-xs text-garda-text-muted mt-1">{t('admin.dashboard_subtitle')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={cn('garda-card p-4 space-y-2 border-garda-border hover:border-garda-border-hover transition-colors', s.bg)}>
            <s.icon className={cn('w-5 h-5', s.color)} />
            <div>
              <p className="text-2xl font-bold font-mono-num">{s.value}</p>
              <p className="text-[11px] text-garda-text-muted">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent API calls */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-sm">{t('admin.recent_activity')}</h2>
        </div>
        {logsLoading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-garda-text-muted text-xs">
            <Loader2 className="w-4 h-4 animate-spin" />{t('common.loading')}
          </div>
        ) : latestLogs.length === 0 ? (
          <div className="garda-card p-6 text-center">
            <ShieldCheck className="w-8 h-8 text-garda-text-muted mx-auto mb-2" />
            <p className="text-xs text-garda-text-muted">{t('admin.no_activity')}</p>
          </div>
        ) : (
          <div className="garda-card p-0 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-garda-border text-garda-text-muted">
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_status')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_function')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_action')}</th>
                  <th className="text-left px-3 py-2.5 font-medium">{t('admin.col_user')}</th>
                  <th className="text-right px-3 py-2.5 font-medium">{t('admin.col_time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-garda-border">
                {latestLogs.slice(0, 10).map((log: any) => (
                  <tr key={log.id} className="hover:bg-garda-surface/30">
                    <td className="px-3 py-2.5">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-mono-num',
                        (log.response_status || 0) < 400 ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-pink/10 text-garda-pink',
                      )}>{log.response_status || '?'}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono-num text-[11px] text-garda-text-secondary">{log.function_name}</td>
                    <td className="px-3 py-2.5 text-[11px]">{log.action}</td>
                    <td className="px-3 py-2.5 text-[11px] text-garda-text-muted">{log.user_email || '—'}</td>
                    <td className="px-3 py-2.5 text-right text-[11px] text-garda-text-muted font-mono-num">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
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

import { cn } from '@/lib/utils';
