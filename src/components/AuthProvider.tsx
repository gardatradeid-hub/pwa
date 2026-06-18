import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Mounted at the app root (above the router) so the Supabase
 * onAuthStateChange listener is always active — including when
 * Google OAuth redirects back with #access_token in the URL hash.
 *
 * Pages consume auth state via useUserStore directly;
 * this component only owns the listener lifecycle.
 */
const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null);

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
