import { apiFetch } from '@/core/api/http-client';

export type AnalysisDataMode = 'panel';
export const DEFAULT_PANEL_YEAR_START = 2022;
export const DEFAULT_PANEL_YEAR_END = 2024;

export interface AnalysisYearRange {
  start: number;
  end: number;
}

export interface ProvincePanelStability {
  province: string;
  observationCount: number;
  dominantCluster: number;
  dominantCount: number;
  consistencyRatio: number;
  isStable: boolean;
  isStrictStable: boolean;
}

export interface PanelStabilitySummary {
  provinceCount: number;
  stableProvinceCount: number;
  stabilityRatio: number;
  thresholdRatio: number;
  strictStableProvinceCount: number;
  strictStabilityRatio: number;
  strictThresholdRatio: number;
  provinces: ProvincePanelStability[];
}

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
  silhouetteScore: number;
  inertia: number;
  daviesBouldin: number;
  calinskiHarabasz: number;
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
  observationCount?: number;
  yearMin?: number;
  yearMax?: number;
  provinces: string[];
  statistics: Record<string, ClusterVariableStats>;
}

export interface ClusterResult {
  k: number;
  assignments: Record<string, number>;
  centers: number[][];
  metrics: ClusterMetrics;
  summary: ClusterSummaryItem[];
  kEvaluation: EvaluateKItem[] | null;
  logTransformed: boolean;
  transformInfo: string[] | null;
  dataMode?: AnalysisDataMode;
  yearRange?: AnalysisYearRange | null;
  panelStability?: PanelStabilitySummary | null;
}

export interface AnalysisRunResult {
  id: string;
  code?: string;
  datasetId: string | null;
  datasetCode?: string | null;
  dataMode?: AnalysisDataMode;
  k: number;
  pcaComponents: PCAComponent[];
  pcaLoadings: Record<string, Record<string, number>>;
  pcaExplainedVariance: PCAExplainedVariance[];
  clusterAssignments: Record<string, number>;
  clusterCenters: number[][];
  silhouetteScore: number;
  inertia: number;
  daviesBouldin: number;
  calinskiHarabasz: number;
  clusterSummary: ClusterSummaryItem[];
  kEvaluation: EvaluateKItem[] | null;
  logTransformed: boolean;
  transformInfo: string[] | null;
  yearRange?: AnalysisYearRange | null;
  panelStability?: PanelStabilitySummary | null;
  createdAt: string;
}

export interface EvaluateKItem {
  k: number;
  silhouetteScore: number;
  inertia: number;
  daviesBouldin: number;
  calinskiHarabasz: number;
  minClusterCount?: number;
  validMinCluster?: boolean;
  consensusStrength?: number;
}

export interface RunAnalysisOptions {
  k?: number;
  autoK?: boolean;
  logTransform?: boolean;
  dataMode?: AnalysisDataMode;
  panelYearStart?: number;
  panelYearEnd?: number;
  normaliseByYear?: boolean;
  kMin?: number;
  kMax?: number;
  minClusterSize?: number;
  consensusRuns?: number;
  kmeansNInit?: number;
  enforceMinClusterSize?: boolean;
}

/** Cluster label & color constants.
 *
 * Default mapping is tuned for K=3 (the dashboard default), where:
 *   0 = Tinggi, 1 = Sedang, 2 = Rendah.
 *
 * For other K values prefer the per-cluster `label` returned by the API
 * (`ClusterSummaryItem.label`) over this constant. */
export const CLUSTER_LABELS: Record<number, string> = {
  0: 'Investasi Tinggi',
  1: 'Investasi Sedang',
  2: 'Investasi Rendah',
  3: 'Investasi Sangat Rendah',
};

export const CLUSTER_COLORS: Record<number, string> = {
  0: '#003c33', // Deep green  – Tinggi (Cohere)
  1: '#1863dc', // Action blue – Sedang (Cohere)
  2: '#ff7759', // Coral       – Rendah (Cohere)
  3: '#75758a', // Slate       – Sangat Rendah (fallback for K=4)
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
  category: string; // VERY_LOW | LOW | MEDIUM | HIGH | VERY_HIGH
  condition: string; // Human-readable: Sangat Rendah, Rendah, etc.
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
    optionsOrK: RunAnalysisOptions | number = { autoK: true },
  ): Promise<AnalysisRunResult> => {
    const requestedPayload: RunAnalysisOptions =
      typeof optionsOrK === 'number' ? { k: optionsOrK, autoK: false } : optionsOrK;
    const payload: RunAnalysisOptions = {
      ...requestedPayload,
      dataMode: 'panel',
      panelYearStart: DEFAULT_PANEL_YEAR_START,
      panelYearEnd: DEFAULT_PANEL_YEAR_END,
      normaliseByYear: true,
    };

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

  evaluateK: async (
    kMin = 2,
    kMax = 8,
    options: {
      panelYearStart?: number;
      panelYearEnd?: number;
      normaliseByYear?: boolean;
      logTransform?: boolean;
      minClusterSize?: number;
      consensusRuns?: number;
      kmeansNInit?: number;
    } = {},
  ): Promise<EvaluateKItem[]> => {
    const searchParams = new URLSearchParams({
      kMin: String(kMin),
      kMax: String(kMax),
      dataMode: 'panel',
      panelYearStart: String(DEFAULT_PANEL_YEAR_START),
      panelYearEnd: String(DEFAULT_PANEL_YEAR_END),
      normaliseByYear: 'true',
    });
    if (typeof options.logTransform === 'boolean') {
      searchParams.set('logTransform', String(options.logTransform));
    }
    if (typeof options.minClusterSize === 'number') {
      searchParams.set('minClusterSize', String(options.minClusterSize));
    }
    if (typeof options.consensusRuns === 'number') {
      searchParams.set('consensusRuns', String(options.consensusRuns));
    }
    if (typeof options.kmeansNInit === 'number') {
      searchParams.set('kmeansNInit', String(options.kmeansNInit));
    }
    const res = await apiFetch<{ evaluations: EvaluateKItem[] }>(
      `/analysis/evaluate-k?${searchParams.toString()}`,
    );
    return res.evaluations;
  },

  /** Get data-driven policy recommendations */
  getPolicy: async (): Promise<PolicyResult> => {
    return apiFetch<PolicyResult>('/analysis/policy');
  },
};
