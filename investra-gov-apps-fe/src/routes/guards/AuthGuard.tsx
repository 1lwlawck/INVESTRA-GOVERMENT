import { Navigate, Outlet } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, hasRole } from '@/stores/auth.store';
import type { UserRole } from '@/stores/auth.store';

interface ProtectedRouteProps {
  /** Minimum role required to access this route (default: 'admin') */
  minRole?: UserRole;
}

export function ProtectedRoute({ minRole = 'admin' }: ProtectedRouteProps) {
  const { isHydrated, isAuthenticated, user } = useAuthStore();

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, minRole)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <ShieldAlert className="h-12 w-12 text-[#002C5F]" />
        <h1 className="text-2xl font-bold text-[#002C5F]">Akses Ditolak</h1>
        <p className="max-w-md text-center text-gray-600">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Silakan hubungi administrator untuk mendapatkan akses.
        </p>
        <a
          href="/"
          className="mt-4 rounded-lg bg-[#002C5F] px-6 py-2 text-white transition-colors hover:bg-[#003D7A]"
        >
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  return <Outlet />;
}
