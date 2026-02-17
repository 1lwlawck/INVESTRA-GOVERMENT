/**
 * Environment Configuration
 * Typed access to environment variables.
 */
export const env = {
  API_BASE_URL: import.meta.env.VITE_API_URL || '/api',
  APP_NAME: 'INVESTRA',
  APP_VERSION: '0.1.0',
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
} as const;
