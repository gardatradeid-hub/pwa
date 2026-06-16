import { Navigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface Props {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: Props) {
  const { isAuthenticated, isLoading, profile } = useUserStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireOnboarding && profile && !profile.onboarding_completed) {
    return <Navigate to="/onboarding/connect" replace />;
  }

  return <>{children}</>;
}
