/**
 * User Entity
 */
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

/** Check if user has at least the given role level */
export function hasRole(user: User | null, minRole: UserRole): boolean {
  if (!user) return false;
  const hierarchy: Record<UserRole, number> = { user: 0, admin: 1, superadmin: 2 };
  return hierarchy[user.role] >= hierarchy[minRole];
}
