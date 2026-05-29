import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { GitBranch, TrendingUp, MapPin, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/core/api/http-client';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  DEFAULT_PANEL_YEAR_START,
  DEFAULT_PANEL_YEAR_END,
} from '@/core/api/analysis.api';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

interface ClusterCard {
  id: number;
  name: string;
  color: string;
  count: number;
  observationCount?: number;
  yearMin?: number;
  yearMax?: number;
  avgPDRB: number;
  avgIPM: number;
  avgInvestment: number;
  provinces: string[];
}

export function ClusteringPage() {
  useDocumentTitle('Clustering');
  const [clusterData, setClusterData] = useState<ClusterResult | null>(null);
  const [clusters, setClusters] = useState<ClusterCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelYearStart, setPanelYearStart] = useState<number>(DEFAULT_PANEL_YEAR_START);
  const [panelYearEnd, setPanelYearEnd] = useState<number>(DEFAULT_PANEL_YEAR_END);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getClusters();
      setClusterData(data);
      if (data.yearRange) {
        setPanelYearStart(data.yearRange.start);
        setPanelYearEnd(data.yearRange.end);
      }
      buildClustersFromSummary(data);
    } catch (err) {
      setClusterData(null);
      if (err instanceof ApiError) {
        if (err.code === 'NO_ACTIVE_DATASET') {
          setError('Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
          return;
        }
        if (err.code === 'ANALYSIS_NOT_FOUND') {
          setError('Belum ada hasil analisis. Jalankan analisis terlebih dahulu.');
          return;
        }
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat data clustering');
    } finally {
      setLoading(false);
    }
  };

  /** Build UI cards directly from the backend summary */
  const buildClustersFromSummary = (data: ClusterResult) => {
    if (!data.summary || data.summary.length === 0) return;

    const items: ClusterCard[] = data.summary.map((s: ClusterSummaryItem) => ({
      id: s.cluster,
      name: `Klaster ${s.cluster + 1} - ${s.label}`,
      color: CLUSTER_COLORS[s.cluster] || '#6B7280',
      count: s.count,
      observationCount: s.observationCount,
      yearMin: s.yearMin,
      yearMax: s.yearMax,
      avgPDRB: s.statistics?.pdrbPerKapita?.mean ?? 0,
      avgIPM: s.statistics?.ipm?.mean ?? 0,
      avgInvestment: (s.statistics?.pmdnRp?.mean ?? 0) + (s.statistics?.fdiRp?.mean ?? 0),
      provinces: [...s.provinces].sort(),
    }));

    setClusters(items);
  };

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    setError(null);
    try {
      await analysisApi.run({
        autoK: false,
        k: 3,
        dataMode: 'panel',
        panelYearStart,
        panelYearEnd,
        normaliseByYear: true,
        enforceMinClusterSize: false,
      });
      await loadClusters();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ACTIVE_DATASET') {
        setError('Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
      } else {
        setError(err instanceof Error ? err.message : 'Gagal menjalankan analisis');
      }
    } finally {
      setRunningAnalysis(false);
    }
  };

  if (loading) {
    return <BasicPageSkeleton cardCount={3} contentBlockCount={2} />;
  }

  if (!clusterData) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
          <p
            className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
          >
            Analisis
          </p>
          <h2
            className="text-xl font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Analisis K-Means Clustering
          </h2>
          <p className="mt-1 text-sm text-[#616161]">
            Pengelompokan provinsi berdasarkan kesamaan karakteristik investasi
          </p>
        </div>
        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-12 text-center">
          <GitBranch className="size-16 mx-auto mb-4 text-[#d9d9dd]" />
          <h3
            className="mb-2 text-lg font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Belum Ada Analisis
          </h3>
          <p className="mb-6 text-sm text-[#616161]">
            Jalankan analisis PCA & K-Means terlebih dahulu untuk melihat hasil clustering.
          </p>
          {error && <p className="mb-4 text-sm text-[#ff7759]">{error}</p>}
          <Button
            onClick={handleRunAnalysis}
            disabled={runningAnalysis}
            className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
          >
            {runningAnalysis ? (
              <Skeleton className="size-4 mr-2 rounded-sm" />
            ) : (
              <Play className="size-4 mr-2" />
            )}
            Jalankan Analisis
          </Button>
        </div>
      </div>
    );
  }

  const totalObservations = Object.keys(clusterData.assignments).length;
  const yearRangeLabel = clusterData.yearRange
    ? `${clusterData.yearRange.start}-${clusterData.yearRange.end}`
    : `${panelYearStart}-${panelYearEnd}`;
  const panelStability = clusterData.panelStability;
  const panelStabilityPercent = panelStability
    ? `${(panelStability.stabilityRatio * 100).toFixed(1)}%`
    : '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
        <p
          className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
        >
          Analisis
        </p>
        <h2
          className="text-xl font-normal tracking-tight text-[#17171c]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Analisis K-Means Clustering
        </h2>
        <p className="mt-1 text-sm text-[#616161]">
          Pengelompokan provinsi berdasarkan kesamaan karakteristik investasi dan pembangunan
        </p>
      </div>

      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-4">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#003c33] px-3 py-1 text-xs font-medium text-white">
              k = {clusterData.k}
            </span>
            <span className="rounded-full bg-[#eeece7] px-3 py-1 text-xs font-medium text-[#212121]">
              Tahun: {yearRangeLabel}
            </span>
            {panelStability && (
              <span className="rounded-full bg-[#eeece7] px-3 py-1 text-xs font-medium text-[#212121]">
                Stabilitas Provinsi: {panelStabilityPercent}
              </span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleRunAnalysis}
              disabled={runningAnalysis}
              className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
            >
              {runningAnalysis ? (
                <Skeleton className="size-4 mr-2 rounded-sm" />
              ) : (
                <Play className="size-4 mr-2" />
              )}
              Jalankan Ulang
            </Button>
          </div>
        </div>
      </div>

      {/* Clustering Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6 text-center transition-all hover:border-[#93939f]">
          <GitBranch className="size-10 text-[#003c33] mx-auto mb-3" />
          <div
            className="text-3xl font-normal tracking-tight text-[#17171c] mb-1"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            {clusterData.k}
          </div>
          <p className="text-sm text-[#616161]">Total Klaster Terbentuk</p>
        </div>

        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6 text-center transition-all hover:border-[#93939f]">
          <MapPin className="size-10 text-[#ff7759] mx-auto mb-3" />
          <div
            className="text-3xl font-normal tracking-tight text-[#17171c] mb-1"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            {totalObservations}
          </div>
          <p className="text-sm text-[#616161]">Observasi Terklasifikasi</p>
        </div>

        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6 text-center transition-all hover:border-[#93939f]">
          <TrendingUp className="size-10 text-[#003c33] mx-auto mb-3" />
          <div
            className="text-3xl font-normal tracking-tight text-[#17171c] mb-1"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            {panelStabilityPercent}
          </div>
          <p className="text-sm text-[#616161]">Stabilitas Provinsi</p>
        </div>
      </div>

      {/* Cluster Details */}
      {clusters.map((cluster) => (
        <div
          key={cluster.id}
          className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white transition-all hover:border-[#93939f]"
        >
          {/* color band */}
          <div className="h-1.5 w-full" style={{ backgroundColor: cluster.color }} />
          <div className="border-b border-[#f2f2f2] px-6 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="size-4 rounded-full" style={{ backgroundColor: cluster.color }} />
                <div>
                  <h3
                    className="text-base font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    {cluster.name}
                  </h3>
                  <p className="mt-1 text-sm text-[#616161]">
                    {`${cluster.observationCount ?? cluster.count} Observasi (${cluster.count} Provinsi${
                      cluster.yearMin && cluster.yearMax
                        ? `, ${cluster.yearMin}-${cluster.yearMax}`
                        : ''
                    })`}
                  </p>
                </div>
              </div>
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: cluster.color }}
              >
                Klaster {cluster.id + 1}
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Metrics */}
            <div>
              <h4
                className="mb-3 text-sm font-medium text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Metrik Rata-rata
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-[#f2f2f2] bg-[#f7f6f3] p-4">
                  <p className="mb-1 text-xs text-[#93939f]">PDRB per Kapita</p>
                  <p
                    className="text-lg font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Rp {cluster.avgPDRB.toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb
                  </p>
                </div>
                <div className="rounded-xl border border-[#f2f2f2] bg-[#f7f6f3] p-4">
                  <p className="mb-1 text-xs text-[#93939f]">IPM Rata-rata</p>
                  <p
                    className="text-lg font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    {cluster.avgIPM.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#f2f2f2] bg-[#f7f6f3] p-4">
                  <p className="mb-1 text-xs text-[#93939f]">Investasi Avg (PMDN+PMA)</p>
                  <p
                    className="text-lg font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Rp{' '}
                    {(cluster.avgInvestment / 1e12).toLocaleString('id-ID', {
                      maximumFractionDigits: 2,
                    })}{' '}
                    T
                  </p>
                </div>
              </div>
            </div>

            {/* Provinces */}
            <div className="mt-auto">
              <h4
                className="mb-3 text-sm font-medium text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Daftar Provinsi
              </h4>
              <div className="flex flex-wrap gap-2">
                {cluster.provinces.map((province) => (
                  <span
                    key={province}
                    className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]"
                  >
                    {province}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
