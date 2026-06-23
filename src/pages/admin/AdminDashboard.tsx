import { useAdminUsers } from '@/hooks/useAdmin';
import { useAdminLogs } from '@/hooks/useAdmin';
import { Loader2, Users, Activity, TrendingUp, TrendingDown } from 'lucide-react';

export default function AdminDashboard() {
  const { data: usersData, isLoading: usersLoading } = useAdminUsers(1, 1);
  const { data: logsData, isLoading: logsLoading } = useAdminLogs(1, 5);

  const totalUsers = usersData?.total ?? 0;
  const latestLogs = logsData?.data ?? [];

  // Count actions
  const actions = latestLogs.reduce((acc: Record<string, number>, l: any) => {
    acc[l.action] = (acc[l.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="garda-card p-4">
          <Users className="w-6 h-6 text-garda-cyan mb-2" />
          <p className="text-2xl font-bold font-mono-num">{usersLoading ? '...' : totalUsers}</p>
          <p className="text-xs text-garda-text-muted">Total Users</p>
        </div>
        <div className="garda-card p-4">
          <Activity className="w-6 h-6 text-garda-amber mb-2" />
          <p className="text-2xl font-bold font-mono-num">{logsLoading ? '...' : logsData?.total ?? 0}</p>
          <p className="text-xs text-garda-text-muted">Total API Calls</p>
        </div>
        <div className="garda-card p-4">
          <TrendingUp className="w-6 h-6 text-garda-cyan mb-2" />
          <p className="text-2xl font-bold font-mono-num">{actions['execute_trade'] || 0}</p>
          <p className="text-xs text-garda-text-muted">Trades Executed</p>
        </div>
        <div className="garda-card p-4">
          <TrendingDown className="w-6 h-6 text-garda-pink mb-2" />
          <p className="text-2xl font-bold font-mono-num">{actions['close_trade'] || 0}</p>
          <p className="text-xs text-garda-text-muted">Trades Closed</p>
        </div>
      </div>

      {/* Latest API calls */}
      <div>
        <h2 className="text-lg font-bold mb-3">Latest API Calls</h2>
        {logsLoading ? (
          <div className="flex items-center gap-2 text-garda-text-muted"><Loader2 className="w-4 h-4 animate-spin" />Memuat...</div>
        ) : latestLogs.length === 0 ? (
          <p className="text-sm text-garda-text-muted">Belum ada aktivitas.</p>
        ) : (
          <div className="space-y-2">
            {latestLogs.map((log: any) => (
              <div key={log.id} className="garda-card p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', log.response_status < 400 ? 'bg-garda-cyan/10 text-garda-cyan' : 'bg-garda-pink/10 text-garda-pink')}>
                    {log.response_status}
                  </span>
                  <span className="font-mono-num">{log.function_name}</span>
                  <span className="text-garda-text-muted">{log.action}</span>
                </div>
                <div className="text-right text-garda-text-muted">
                  <span>{log.user_email}</span>
                  <span className="ml-2">{new Date(log.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
