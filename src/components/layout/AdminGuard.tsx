import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/config/supabase';
import { useUserStore } from '@/store/useUserStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface Props {
  children: ReactNode;
}

export function AdminGuard({ children }: Props) {
  const { profile } = useUserStore();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function check() {
      try {
        if (!profile) { setIsAdmin(false); setChecking(false); return; }
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('id', profile.id)
          .maybeSingle();

        setIsAdmin(!error && !!data);
      } catch { setIsAdmin(false); }
      finally { setChecking(false); }
    }
    check();
  }, [profile]);

  if (checking) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/app" replace />;
  return <>{children}</>;
}
