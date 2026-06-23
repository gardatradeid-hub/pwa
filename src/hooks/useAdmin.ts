import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';

async function adminCall<T>(params: Record<string, any>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body: params,
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data as T;
}

interface ListUsersResponse {
  success: boolean;
  data: any[];
  total: number;
  page: number;
  limit: number;
}

interface GetLogsResponse {
  success: boolean;
  data: any[];
  total: number;
  page: number;
  limit: number;
}

interface GetConfigResponse {
  success: boolean;
  data: Record<string, any>;
}

interface GetUserResponse {
  success: boolean;
  data: { user: any; trades: any[]; stats: any[] };
}

export function useAdminUsers(page = 1, limit = 20) {
  return useQuery<ListUsersResponse>({
    queryKey: ['admin', 'users', page, limit],
    queryFn: () => adminCall({ action: 'list_users', page, limit }),
    staleTime: 30_000,
  });
}

export function useAdminUser(userId: string | null) {
  return useQuery<GetUserResponse>({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminCall({ action: 'get_user', user_id: userId }),
    enabled: !!userId,
  });
}

export function useAdminLogs(page = 1, limit = 50, userId?: string) {
  return useQuery<GetLogsResponse>({
    queryKey: ['admin', 'logs', page, limit, userId],
    queryFn: () => adminCall({ action: 'get_logs', page, limit, user_id: userId }),
    staleTime: 10_000,
  });
}

export function useAdminConfig() {
  return useQuery<GetConfigResponse>({
    queryKey: ['admin', 'config'],
    queryFn: () => adminCall({ action: 'get_config' }),
    staleTime: 60_000,
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { user_id: string; current_phase?: number; onboarding_completed?: boolean; exchange?: string }) =>
      adminCall({ action: 'update_user', ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['admin', 'user'] });
    },
  });
}

export function useUpdateConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { key: string; value: any }) =>
      adminCall({ action: 'update_config', ...params }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'config'] });
    },
  });
}
