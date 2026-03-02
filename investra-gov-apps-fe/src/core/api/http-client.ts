/**
 * Base API Service
 *
 * Centralized fetch wrapper for Flask backend with JWT auth.
 */

import { useAuthStore, type User } from '@/stores/auth.store';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_REFRESH_BUFFER_SECONDS = 5 * 60;

let refreshTokenPromise: Promise<string | null> | null = null;

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function shouldRefreshToken(token: string): boolean {
  const payload = parseJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== 'number') return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp - nowSeconds <= TOKEN_REFRESH_BUFFER_SECONDS;
}

function isAuthBypassEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/refresh');
}

function isLoginEndpoint(endpoint: string): boolean {
  return endpoint.startsWith('/auth/login');
}

interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  detail?: unknown;
  details?: unknown;
}

async function readApiError(response: Response): Promise<ApiErrorPayload> {
  return response
    .json()
    .catch(() => ({ error: 'Network error' })) as Promise<ApiErrorPayload>;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Retrieve JWT token from in-memory state only.
 */
export function getToken(): string | null {
  return useAuthStore.getState().token;
}

function setAuthState(user: User, token: string): void {
  useAuthStore.getState().login(user, token);
}

function clearAuthState(): void {
  useAuthStore.getState().logout();
}

/**
 * Clear auth state and redirect to login page.
 */
function handleUnauthorized(): void {
  clearAuthState();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

async function refreshAccessToken(currentToken: string): Promise<string | null> {
  if (refreshTokenPromise) return refreshTokenPromise;

  refreshTokenPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${currentToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as { token?: string; user?: User };
      if (!body.token || !body.user) {
        return null;
      }

      setAuthState(body.user, body.token);
      return body.token;
    } catch {
      return null;
    }
  })();

  const token = await refreshTokenPromise;
  refreshTokenPromise = null;
  return token;
}

async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit & { signal?: AbortSignal },
  hasRetried: boolean = false,
): Promise<T> {
  const existingToken = getToken();
  let tokenToUse = existingToken;

  if (
    tokenToUse &&
    !isAuthBypassEndpoint(endpoint) &&
    shouldRefreshToken(tokenToUse)
  ) {
    const refreshedToken = await refreshAccessToken(tokenToUse);
    tokenToUse = refreshedToken ?? tokenToUse;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };

  if (tokenToUse) {
    headers.Authorization = `Bearer ${tokenToUse}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      signal: options?.signal,
    });
  } catch {
    throw new ApiError(
      'Tidak dapat terhubung ke server. Periksa koneksi atau status backend.',
      0,
      'NETWORK_ERROR',
    );
  }

  if (response.status === 401) {
    const error = await readApiError(response);
    const errorMessage = error.error || error.message || 'Unauthorized';

    if (isLoginEndpoint(endpoint)) {
      throw new ApiError(errorMessage, 401, error.code, error.details ?? error.detail);
    }

    if (!hasRetried && tokenToUse && !isAuthBypassEndpoint(endpoint)) {
      const refreshedToken = await refreshAccessToken(tokenToUse);
      if (refreshedToken) {
        return apiFetch<T>(endpoint, options, true);
      }
    }

    handleUnauthorized();
    throw new ApiError(
      'Sesi telah berakhir. Silakan login kembali.',
      401,
      error.code,
      error.details ?? error.detail,
    );
  }

  if (!response.ok) {
    const error = await readApiError(response);
    throw new ApiError(
      error.error || error.message || `HTTP ${response.status}`,
      response.status,
      error.code,
      error.details ?? error.detail,
    );
  }

  return response.json();
}

export { apiFetch, API_BASE_URL };
