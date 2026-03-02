import { apiFetch, getToken, API_BASE_URL } from '@/core/api/http-client';

// ── Types ─────────────────────────────────────────────────────

export interface DatasetVersion {
  id: string;
  code?: string;
  version: number;
  name: string;
  description: string | null;
  year: number;
  isActive: boolean;
  createdAt: string;
  originalFilename: string | null;
  checksum: string | null;
  rowCount: number;
  uploadedBy: {
    id: string;
    code?: string;
    username: string;
    fullName: string;
  } | null;
}

export interface DatasetInfo extends DatasetVersion {
  columnCount: number;
  columns: string[];
}

export interface DatasetData {
  data: Record<string, any>[];
  columns: string[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VersionListResponse {
  versions: DatasetVersion[];
  total: number;
}

export interface UploadResult {
  message: string;
  dataset: DatasetVersion;
  recordCount?: number;
  rowCount: number;
  year: number;
  yearRange?: { min: number; max: number };
  version: number;
  columns: string[];
}

export interface UploadError {
  error: string;
  detail?: string[];
  totalErrors?: number;
  required?: string[];
  found?: string[];
  existingVersion?: DatasetVersion;
}

// ── API ───────────────────────────────────────────────────────

export const datasetApi = {
  // Active dataset
  getDefaultDatasetInfo: async (): Promise<DatasetInfo> => {
    return apiFetch<DatasetInfo>('/dataset/default');
  },

  getDefaultDatasetData: async (
    page: number = 1,
    pageSize: number = 50,
  ): Promise<DatasetData> => {
    return apiFetch<DatasetData>(
      `/dataset/default/data?page=${page}&pageSize=${pageSize}`
    );
  },

  getDefaultDatasetSample: async (n: number = 5): Promise<DatasetData> => {
    return apiFetch<DatasetData>(`/dataset/default/sample?n=${n}`);
  },

  // Version management
  listVersions: async (): Promise<VersionListResponse> => {
    return apiFetch<VersionListResponse>('/dataset/versions');
  },

  getVersion: async (versionId: string): Promise<DatasetInfo & { data: Record<string, any>[] }> => {
    return apiFetch<DatasetInfo & { data: Record<string, any>[] }>(
      `/dataset/versions/${versionId}`
    );
  },

  activateVersion: async (versionId: string): Promise<DatasetVersion & { message: string }> => {
    return apiFetch<DatasetVersion & { message: string }>(
      `/dataset/versions/${versionId}/activate`,
      { method: 'PUT' }
    );
  },

  /**
   * Upload a CSV file as a new dataset version (superadmin only).
   * Uses raw fetch because apiFetch always sets Content-Type: application/json.
   */
  uploadCSV: async (
    file: File,
    year: number = 2023,
    name?: string,
    description?: string,
  ): Promise<UploadResult> => {
    const token = getToken();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('year', String(year));
    if (name) formData.append('name', name);
    if (description) formData.append('description', description);

    const res = await fetch(`${API_BASE_URL}/dataset/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const err = (body || {}) as UploadError;
      throw new Error(
        Array.isArray(err.detail)
          ? `${err.error}\n${err.detail.join('\n')}`
          : err.error || `HTTP ${res.status}`
      );
    }

    return body as UploadResult;
  },
};
