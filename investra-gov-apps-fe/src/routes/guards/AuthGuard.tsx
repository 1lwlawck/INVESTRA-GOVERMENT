import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, hasRole } from '@/stores/auth.store';
import type { UserRole } from '@/stores/auth.store';

interface ProtectedRouteProps {
  /** Minimum role required to access this route (default: 'admin') */
  minRole?: UserRole;
}

export function ProtectedRoute({ minRole = 'admin' }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(user, minRole)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-[#002C5F]">Akses Ditolak</h1>
        <p className="text-gray-600 text-center max-w-md">
          Anda tidak memiliki izin untuk mengakses halaman ini.
          Silakan hubungi administrator untuk mendapatkan akses.
        </p>
        <a href="/" className="mt-4 px-6 py-2 bg-[#002C5F] text-white rounded-lg hover:bg-[#003D7A] transition-colors">
          Kembali ke Beranda
        </a>
      </div>
    );
  }

  return <Outlet />;
}
