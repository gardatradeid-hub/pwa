import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn, clearAdminToken } from '@/pages/admin/AdminLogin';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface Props {
  children: ReactNode;
}

/**
 * AdminGuard checks the admin token AND verifies it server-side via admin-api.
 * Guard is server-validate, not just client-side decode.
 */
export function AdminGuard({ children }: Props) {
  const [verified, setVerified] = useState<'loading' | 'valid' | 'invalid'>('loading');

  useEffect(() => {
    async function verify() {
      if (!isAdminLoggedIn()) {
        clearAdminToken();
        setVerified('invalid');
        return;
      }

      try {
        const { adminFetch } = await import('@/pages/admin/AdminLogin');
        const result = await adminFetch('admin-api', { action: 'check_admin' });
        setVerified(result?.success && result?.data?.role ? 'valid' : 'invalid');
      } catch {
        clearAdminToken();
        setVerified('invalid');
      }
    }
    verify();
  }, []);

  if (verified === 'loading') return <LoadingScreen />;
  if (verified === 'invalid') return <Navigate to="/admin/login" replace />;
  return <>{children}</>;
}
