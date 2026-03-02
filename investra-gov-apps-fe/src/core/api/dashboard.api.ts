import { apiFetch } from '@/core/api/http-client';

export interface DashboardSummary {
  totalProvinces: number;
  totalInvestment: number;
  averageIpm: number;
  averageKemiskinan: number;
  averagePdrbPerKapita: number;
  averageTpt: number;
  averageAksesListrik: number;
  datasetVersion: number;
  datasetYear: number;
  datasetYearMin: number;
  datasetYearMax: number;
}

export interface ProvinceListItem {
  id: string;
  code?: string;
  provinsi: string;
}

export const dashboardApi = {
  getSummary: async (): Promise<DashboardSummary> => {
    return apiFetch<DashboardSummary>('/dashboard/summary');
  },
  getProvinces: async (): Promise<ProvinceListItem[]> => {
    const res = await apiFetch<{ provinces: ProvinceListItem[] }>('/provinces');
    return res.provinces;
  },
};
