import { describe, expect, it } from 'vitest';
import { hasRole, type User } from '@/stores/auth.store';

const baseUser: User = {
  id: 'u-1',
  username: 'tester',
  email: 'tester@x.test',
  fullName: 'Tester',
  role: 'user',
  isActive: true,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('hasRole', () => {
  it('returns false when user is null', () => {
    expect(hasRole(null, 'user')).toBe(false);
    expect(hasRole(null, 'admin')).toBe(false);
    expect(hasRole(null, 'superadmin')).toBe(false);
  });

  it('user role can access user but not admin', () => {
    const user: User = { ...baseUser, role: 'user' };
    expect(hasRole(user, 'user')).toBe(true);
    expect(hasRole(user, 'admin')).toBe(false);
    expect(hasRole(user, 'superadmin')).toBe(false);
  });

  it('admin role can access user and admin but not superadmin', () => {
    const admin: User = { ...baseUser, role: 'admin' };
    expect(hasRole(admin, 'user')).toBe(true);
    expect(hasRole(admin, 'admin')).toBe(true);
    expect(hasRole(admin, 'superadmin')).toBe(false);
  });

  it('superadmin role can access everything', () => {
    const superadmin: User = { ...baseUser, role: 'superadmin' };
    expect(hasRole(superadmin, 'user')).toBe(true);
    expect(hasRole(superadmin, 'admin')).toBe(true);
    expect(hasRole(superadmin, 'superadmin')).toBe(true);
  });
});
