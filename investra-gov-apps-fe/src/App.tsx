import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from '@/routes/index';
import { authApi } from '@/core/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

function AuthBootstrap() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
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
      .catch(() => {
        if (!active) return;
        logout();
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, logout, setUser, token]);

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
