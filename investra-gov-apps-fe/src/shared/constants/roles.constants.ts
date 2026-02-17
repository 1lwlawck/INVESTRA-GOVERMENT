/**
 * Role Constants
 */
import type { UserRole } from '@/core/entities/user.entity';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  admin: 1,
  superadmin: 2,
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'User',
  admin: 'Admin',
  superadmin: 'Super Admin',
} as const;
