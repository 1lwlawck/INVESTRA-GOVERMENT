import { apiFetch } from '@/core/api/http-client';

export interface PublicDataset {
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
}

export interface PublicYearRange {
  start: number | null;
  end: number | null;
}

export interface PublicClusterSummary {
  clusterId: number;
  label: string;
  color: string;
  provinceCount: number;
  observationCount: number;
  provinces: string[];
  policyRationale?: string | null;
  dominantFactor?: string | null;
}

export interface PublicVariable {
  key: string;
  label: string;
}

export interface PublicAnalysisSummary {
  dataset: PublicDataset;
  analysis: {
    id: string;
    code?: string;
    k: number;
    createdAt: string;
    silhouetteScore: number;
    daviesBouldin: number;
    calinskiHarabasz: number;
  };
  yearRange: PublicYearRange;
  clusters: PublicClusterSummary[];
  variables: PublicVariable[];
  limitations: string[];
}

export interface PublicProvinceListItem {
  id: string;
  provinsi: string;
}

export interface PublicIndicator {
  label: string;
  value: number;
}

export interface PublicPolicyDirection {
  direction: string;
  rationale: string;
  actions: string[];
}

export interface PublicProvinceAnalysis {
  province: string;
  dataset: PublicDataset;
  yearRange: PublicYearRange;
  cluster: {
    id: number;
    label: string;
    color: string;
    dominantCount: number;
    observationCount: number;
    consistencyRatio: number;
    provinceCount: number;
    dominantFactor?: string | null;
    policyRationale?: string | null;
    policyDirections: PublicPolicyDirection[];
  };
  indicators: Record<string, PublicIndicator>;
  analysis: {
    id: string;
    code?: string;
    createdAt: string;
  };
  plainLanguageNote: string;
}

export const publicApi = {
  getSummary: async (): Promise<PublicAnalysisSummary> => {
    return apiFetch<PublicAnalysisSummary>('/public/analysis/summary');
  },

  getProvinces: async (): Promise<PublicProvinceListItem[]> => {
    const res = await apiFetch<{ provinces: PublicProvinceListItem[] }>('/public/provinces');
    return res.provinces;
  },

  getProvinceAnalysis: async (province: string): Promise<PublicProvinceAnalysis> => {
    return apiFetch<PublicProvinceAnalysis>(
      `/public/provinces/${encodeURIComponent(province)}/analysis`,
    );
  },
};
