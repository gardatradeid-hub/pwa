import { Navigate } from 'react-router-dom';
import { useUserStore } from '@/store/useUserStore';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

interface Props {
  children: React.ReactNode;
}

export function OnboardingGuard({ children }: Props) {
  const { isLoading, profile } = useUserStore();

  if (isLoading) {
    return <LoadingScreen />;
  }

  // If already completed onboarding, redirect to app
  if (profile?.onboarding_completed) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
