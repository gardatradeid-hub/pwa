import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { isAdminLoggedIn } from '@/pages/admin/AdminLogin';

interface Props {
  children: ReactNode;
}

/**
 * AdminGuard uses its own auth mechanism (separate from Supabase user auth).
 * Checks for a valid admin token in localStorage.
 */
export function AdminGuard({ children }: Props) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
