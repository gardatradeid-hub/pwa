import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingLayout } from '@/components/layout/LandingLayout';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { OnboardingGuard } from '@/components/layout/OnboardingGuard';
import { AdminGuard } from '@/components/layout/AdminGuard';

import { lazy } from 'react';

const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const AuthPage = lazy(() => import('@/pages/auth/AuthPage'));
const ConnectExchange = lazy(() => import('@/pages/onboarding/ConnectExchange'));
const AcceptRules = lazy(() => import('@/pages/onboarding/AcceptRules'));
const Dashboard = lazy(() => import('@/pages/app/Dashboard'));
const TradePage = lazy(() => import('@/pages/app/TradePage'));
const JournalPage = lazy(() => import('@/pages/app/JournalPage'));
const JournalDetail = lazy(() => import('@/pages/app/JournalDetail'));
const StatsPage = lazy(() => import('@/pages/app/StatsPage'));
const ProfilePage = lazy(() => import('@/pages/app/ProfilePage'));
const LockedPage = lazy(() => import('@/pages/states/LockedPage'));
const EvaluationPage = lazy(() => import('@/pages/states/EvaluationPage'));
const ReflectionPage = lazy(() => import('@/pages/states/ReflectionPage'));

// Admin
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminUserDetail = lazy(() => import('@/pages/admin/AdminUserDetail'));
const AdminAuditLogs = lazy(() => import('@/pages/admin/AdminAuditLogs'));
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'));

export const router = createBrowserRouter([
  // LANDING
  { path: '/', element: <LandingLayout />, children: [{ index: true, element: <LandingPage /> }] },

  // AUTH
  { path: '/login', element: <LandingLayout />, children: [{ index: true, element: <AuthPage /> }] },
  { path: '/register', element: <LandingLayout />, children: [{ index: true, element: <AuthPage /> }] },
  { path: '/register/:referralCode', element: <LandingLayout />, children: [{ index: true, element: <AuthPage /> }] },

  // ONBOARDING
  {
    path: '/onboarding',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: 'connect', element: <OnboardingGuard><ConnectExchange /></OnboardingGuard> },
      { path: 'rules', element: <OnboardingGuard><AcceptRules /></OnboardingGuard> },
    ],
  },

  // APP
  {
    path: '/app',
    element: <ProtectedRoute requireOnboarding><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'trade', element: <TradePage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'journal/:id', element: <JournalDetail /> },
      { path: 'stats', element: <StatsPage /> },
      { path: 'profile', element: <ProfilePage /> },
      { path: 'locked', element: <LockedPage /> },
      { path: 'reflection', element: <ReflectionPage /> },
      { path: 'evaluation', element: <EvaluationPage /> },
    ],
  },

  // ADMIN
  {
    path: '/admin',
    element: <ProtectedRoute requireOnboarding><AdminGuard><AdminLayout /></AdminGuard></ProtectedRoute>,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: 'users', element: <AdminUsers /> },
      { path: 'users/:userId', element: <AdminUserDetail /> },
      { path: 'logs', element: <AdminAuditLogs /> },
      { path: 'settings', element: <AdminSettings /> },
    ],
  },

  // CATCH ALL
  { path: '*', element: <LandingLayout />, children: [{ path: '*', element: <LandingPage /> }] },
]);
