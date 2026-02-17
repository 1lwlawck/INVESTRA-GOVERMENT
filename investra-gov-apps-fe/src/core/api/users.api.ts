import { apiFetch } from '@/core/api/http-client';
import type { User, UserRole } from '@/stores/auth.store';

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  isActive?: boolean;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const usersApi = {
  list: async (): Promise<User[]> => {
    const res = await apiFetch<{ users: User[] }>('/users');
    return res.users;
  },

  get: async (id: number): Promise<User> => {
    const res = await apiFetch<{ user: User }>(`/users/${id}`);
    return res.user;
  },

  create: async (data: CreateUserRequest): Promise<User> => {
    const res = await apiFetch<{ user: User; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.user;
  },

  update: async (id: number, data: UpdateUserRequest): Promise<User> => {
    const res = await apiFetch<{ user: User; message: string }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res.user;
  },

  delete: async (id: number): Promise<void> => {
    await apiFetch<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },
};
