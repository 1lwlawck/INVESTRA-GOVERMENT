/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend API base URL (default: '/api' via Vite proxy in dev). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
