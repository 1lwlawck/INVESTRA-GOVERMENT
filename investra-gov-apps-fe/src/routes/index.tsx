/**
 * Route Configuration
 *
 * Centralized router using React Router v6 createBrowserRouter.
 * All page components are lazy-loaded for optimal code splitting.
 */

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/routes/guards/AuthGuard';
import { RouteErrorView } from '@/routes/guards/RouteErrorView';
import { Skeleton } from '@/components/ui/skeleton';

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      const mod = await importer();
      sessionStorage.removeItem('investra_lazy_retry');
      return mod;
    } catch (error) {
      const hasRetried = sessionStorage.getItem('investra_lazy_retry') === '1';
      if (!hasRetried) {
        sessionStorage.setItem('investra_lazy_retry', '1');
        window.location.reload();
      }
      throw error;
    }
  });
}

// ── Lazy-loaded pages ────────────────────────────────────────
const LandingPage = lazyWithRetry(() =>
  import('@/pages/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const LoginPage = lazyWithRetry(() =>
  import('@/pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const DashboardTemplate = lazyWithRetry(() =>
  import('@/templates/DashboardTemplate').then((m) => ({ default: m.DashboardTemplate })),
);
const DashboardPage = lazyWithRetry(() =>
  import('@/pages/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const PCAAnalysisPage = lazyWithRetry(() =>
  import('@/pages/analysis/PCAAnalysisPage').then((m) => ({ default: m.PCAAnalysisPage })),
);
const ClusteringPage = lazyWithRetry(() =>
  import('@/pages/analysis/ClusteringPage').then((m) => ({ default: m.ClusteringPage })),
);
const VisualizationPage = lazyWithRetry(() =>
  import('@/pages/visualization/VisualizationPage').then((m) => ({ default: m.VisualizationPage })),
);
const PolicyPage = lazyWithRetry(() =>
  import('@/pages/policy/PolicyPage').then((m) => ({ default: m.PolicyPage })),
);
const AboutPage = lazyWithRetry(() =>
  import('@/pages/about/AboutPage').then((m) => ({ default: m.AboutPage })),
);
const DatasetPage = lazyWithRetry(() =>
  import('@/pages/dataset/DatasetPage').then((m) => ({ default: m.DatasetPage })),
);
const UserManagementPage = lazyWithRetry(() =>
  import('@/pages/admin/UserManagementPage').then((m) => ({ default: m.UserManagementPage })),
);

// ── Shared loading fallback ──────────────────────────────────
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="w-full max-w-xl space-y-4 px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: withSuspense(LandingPage),
    errorElement: <RouteErrorView />,
  },
  {
    path: '/login',
    element: withSuspense(LoginPage),
    errorElement: <RouteErrorView />,
  },
  {
    path: '/dashboard',
    element: <ProtectedRoute minRole="admin" />,
    errorElement: <RouteErrorView />,
    children: [
      {
        element: withSuspense(DashboardTemplate),
        children: [
          {
            index: true,
            element: withSuspense(DashboardPage),
          },
          {
            path: 'dataset',
            element: withSuspense(DatasetPage),
          },
          {
            path: 'pca',
            element: withSuspense(PCAAnalysisPage),
          },
          {
            path: 'clustering',
            element: withSuspense(ClusteringPage),
          },
          {
            path: 'visualization',
            element: withSuspense(VisualizationPage),
          },
          {
            path: 'policy',
            element: withSuspense(PolicyPage),
          },
          {
            path: 'about',
            element: withSuspense(AboutPage),
          },
          {
            path: 'users',
            element: <ProtectedRoute minRole="superadmin" />,
            children: [
              {
                index: true,
                element: withSuspense(UserManagementPage),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
