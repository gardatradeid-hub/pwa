import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { useTradeStore } from '@/store/useTradeStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface Props {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: Props) {
  const { isAuthenticated, isLoading, profile } = useUserStore();
  const { isLocked, cooldownUntil } = useTradeStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding/connect" replace />;
  }

  // Locked user redirect — spec §5 / §8.12. We bypass the redirect if the user
  // is already on /app/locked (reading the lock screen itself), or on
  // /app/journal/* and /app/stats (allowed during lock per spec §8.12 tips:
  // "Review your last 3 trades in Journal" / "View Stats"), or on
  // /app/evaluation (the post-drawdown review screen — separate from lock).
  // Cooldown still keeps the user on the dashboard; only hard locks force
  // navigation away from /app/trade.
  if (requireOnboarding && isLocked) {
    const path = location.pathname;
    const allowedDuringLock =
      path.startsWith('/app/locked') ||
      path.startsWith('/app/journal') ||
      path.startsWith('/app/stats') ||
      path.startsWith('/app/profile') ||
      path.startsWith('/app/evaluation');
    if (!allowedDuringLock) {
      return <Navigate to="/app/locked" replace />;
    }
  }

  // Cooldown on its own does NOT trigger a redirect (the dashboard renders a
  // CooldownCard inline per §8.15). It only blocks the trade form, which is
  // handled in TradePage. We surface `cooldownUntil` here purely so future
  // route-level decisions have access to it.
  void cooldownUntil;

  return <>{children}</>;
}
