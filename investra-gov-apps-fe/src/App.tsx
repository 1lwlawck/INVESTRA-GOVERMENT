import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/index';
import { authApi } from '@/core/api/auth.api';
import { ApiError } from '@/core/api/http-client';
import { useAuthStore } from '@/stores/auth.store';

function AuthBootstrap() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (!isHydrated) return;

    if (!token) {
      if (isAuthenticated) logout();
      return;
    }

    let active = true;
    authApi
      .me()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          logout();
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, isHydrated, logout, setUser, token]);

  return null;
}

export default function App() {
  return (
    <>
      <AuthBootstrap />
      <RouterProvider router={router} />
    </>
  );
}
