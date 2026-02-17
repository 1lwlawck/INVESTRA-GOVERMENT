import { apiFetch } from '@/core/api/http-client';
import type { User } from '@/stores/auth.store';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: User;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  me: async (): Promise<{ user: User }> => {
    return apiFetch<{ user: User }>('/auth/me');
  },
  refresh: async (): Promise<LoginResponse> => {
    return apiFetch<LoginResponse>('/auth/refresh', {
      method: 'POST',
    });
  },
};
