/**
 * API Constants
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    REFRESH: '/auth/refresh',
  },
  DASHBOARD: {
    SUMMARY: '/dashboard/summary',
    PROVINCES: '/provinces',
  },
  DATASET: {
    DEFAULT: '/dataset/default',
    VERSIONS: '/dataset/versions',
    ACTIVATE: (id: number) => `/dataset/versions/${id}/activate`,
    UPLOAD: '/dataset/upload',
  },
  ANALYSIS: {
    RUN: '/analysis/run',
    PCA: '/analysis/pca',
    CLUSTERS: '/analysis/clusters',
    EVALUATE_K: '/analysis/evaluate-k',
    POLICY: '/analysis/policy',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: number) => `/users/${id}`,
  },
} as const;
