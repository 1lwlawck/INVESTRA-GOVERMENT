import { apiFetch } from '@/core/api/http-client';

export interface PCAComponent {
  component: number;
  explainedVarianceRatio: number;
  scores: Record<string, number>;
}

export interface PCAExplainedVariance {
  component: number;
  variance: number;
  cumulative: number;
}

export interface PCAResult {
  components: PCAComponent[];
  loadings: Record<string, Record<string, number>>;
  explainedVariance: PCAExplainedVariance[];
}

export interface ClusterMetrics {
  silhouette_score: number;
  inertia: number;
  davies_bouldin: number;
  calinski_harabasz: number;
}

/** Per-variable statistics inside a cluster summary */
export interface ClusterVariableStats {
  mean: number;
  min: number;
  max: number;
  std: number;
}

/** One cluster's summary returned by the backend */
export interface ClusterSummaryItem {
  cluster: number;
  label: string;
  count: number;
  provinces: string[];
  statistics: Record<string, ClusterVariableStats>;
}

export interface ClusterResult {
  k: number;
  assignments: Record<string, number>;
  centers: number[][];
  metrics: ClusterMetrics;
  summary: ClusterSummaryItem[];
  k_evaluation: EvaluateKItem[] | null;
  log_transformed: boolean;
  transform_info: string[] | null;
}

export interface AnalysisRunResult {
  id: string;
  code?: string;
  internal_id?: number;
  dataset_id: string | null;
  dataset_code?: string | null;
  k: number;
  pca_components: PCAComponent[];
  pca_loadings: Record<string, Record<string, number>>;
  pca_explained_variance: PCAExplainedVariance[];
  cluster_assignments: Record<string, number>;
  cluster_centers: number[][];
  silhouette_score: number;
  inertia: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  cluster_summary: ClusterSummaryItem[];
  k_evaluation: EvaluateKItem[] | null;
  log_transformed: boolean;
  transform_info: string[] | null;
  created_at: string;
}

export interface EvaluateKItem {
  k: number;
  silhouette_score: number;
  inertia: number;
  davies_bouldin: number;
  calinski_harabasz: number;
  min_cluster_count?: number;
  valid_min_cluster?: boolean;
}

export interface RunAnalysisOptions {
  k?: number;
  autoK?: boolean;
  logTransform?: boolean;
  kMin?: number;
  kMax?: number;
  minClusterSize?: number;
}

/** Cluster label & color constants (0 = highest investment -> 3 = lowest) */
export const CLUSTER_LABELS: Record<number, string> = {
  0: 'Investasi Sangat Tinggi',
  1: 'Investasi Tinggi',
  2: 'Investasi Sedang',
  3: 'Investasi Rendah',
};

export const CLUSTER_COLORS: Record<number, string> = {
  0: '#059669', // Green – Sangat Tinggi
  1: '#3B82F6', // Blue  – Tinggi
  2: '#F9B233', // Gold  – Sedang
  3: '#DC2626', // Red   – Rendah
};

/** Human-readable labels for numeric columns */
export const FEATURE_LABELS: Record<string, string> = {
  pmdnRp: 'PMDN (Investasi Dalam Negeri)',
  fdiRp: 'PMA (Investasi Asing)',
  pdrbPerKapita: 'PDRB per Kapita',
  ipm: 'Indeks Pembangunan Manusia',
  kemiskinan: 'Kemiskinan',
  aksesListrik: 'Akses Listrik',
  tpt: 'Tingkat Pengangguran Terbuka',
};

/* ─── Policy Recommendation types ─── */

export interface PolicyCharacteristic {
  label: string;
  clusterMean: number;
  nationalMean: number;
  ratio: number;
  category: string;        // VERY_LOW | LOW | MEDIUM | HIGH | VERY_HIGH
  condition: string;        // Human-readable: Sangat Rendah, Rendah, etc.
}

export interface PolicyDirection {
  direction: string;
  rationale: string;
  actions: string[];
}

export interface PCAInterpretation {
  component: string;
  dimension: string;
  dominantVariables: {
    variable: string;
    label: string;
    loading: number;
    direction: string;
  }[];
}

export interface ClusterPolicy {
  clusterId: number;
  label: string;
  count: number;
  provinces: string[];
  characteristics: Record<string, PolicyCharacteristic>;
  dominantFactor: string;
  policyDirections: PolicyDirection[];
  policyRationale: string;
}

export interface PolicyResult {
  nationalAverage: Record<string, { label: string; value: number }>;
  pcaInterpretation: PCAInterpretation[];
  clusterPolicies: ClusterPolicy[];
  metadata: {
    k: number;
    datasetId: string | null;
    datasetCode?: string | null;
    analysisId: string;
    analysisCode?: string;
    logTransformed: boolean;
  };
}

export const analysisApi = {
  /** Run full PCA + K-Means analysis */
  run: async (
    optionsOrK: RunAnalysisOptions | number = { autoK: true }
  ): Promise<AnalysisRunResult> => {
    const payload: RunAnalysisOptions =
      typeof optionsOrK === 'number'
        ? { k: optionsOrK, autoK: false }
        : optionsOrK;

    return apiFetch<AnalysisRunResult>('/analysis/run', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getPCA: async (): Promise<PCAResult> => {
    return apiFetch<PCAResult>('/analysis/pca');
  },

  getClusters: async (): Promise<ClusterResult> => {
    return apiFetch<ClusterResult>('/analysis/clusters');
  },

  evaluateK: async (kMin = 2, kMax = 8): Promise<EvaluateKItem[]> => {
    const res = await apiFetch<{ evaluations: EvaluateKItem[] }>(
      `/analysis/evaluate-k?kMin=${kMin}&kMax=${kMax}`
    );
    return res.evaluations;
  },

  /** Get data-driven policy recommendations */
  getPolicy: async (): Promise<PolicyResult> => {
    return apiFetch<PolicyResult>('/analysis/policy');
  },
};

