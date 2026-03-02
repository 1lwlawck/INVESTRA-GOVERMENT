import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  code?: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  isHydrated: boolean;
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  setHydrated: (hydrated: boolean) => void;
  login: (user: User, token: string) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isHydrated: false,
      isAuthenticated: false,
      user: null,
      token: null,
      setHydrated: (isHydrated: boolean) => set({ isHydrated }),
      login: (user: User, token: string) =>
        set({ isAuthenticated: true, user, token }),
      setUser: (user: User | null) =>
        set((state) => ({ user, isAuthenticated: Boolean(state.token && user) })),
      setToken: (token: string | null) =>
        set((state) => ({ token, isAuthenticated: Boolean(token && state.user) })),
      logout: () =>
        set({ isAuthenticated: false, user: null, token: null }),
    }),
    {
      name: 'investra-auth-v2',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);

/** Helper: check if user has at least the given role level */
export function hasRole(user: User | null, minRole: UserRole): boolean {
  if (!user) return false;
  const hierarchy: Record<UserRole, number> = { user: 0, admin: 1, superadmin: 2 };
  return hierarchy[user.role] >= hierarchy[minRole];
}
