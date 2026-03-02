import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, TrendingUp, MapPin, Play } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from '@/core/api/http-client';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  DEFAULT_PANEL_YEAR_START,
  DEFAULT_PANEL_YEAR_END,
} from "@/core/api/analysis.api";
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

export function ClusteringView() {
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
        k: 4,
        dataMode: 'panel',
        panelYearStart,
        panelYearEnd,
        normaliseByYear: true,
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
        <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-[#002C5F]">Analisis K-Means Clustering</h2>
          <p className="text-gray-600 mt-2">Pengelompokan provinsi berdasarkan kesamaan karakteristik investasi</p>
        </div>
        <Card className="border border-gray-200">
          <CardContent className="p-12 text-center">
            <GitBranch className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Analisis</h3>
            <p className="text-gray-500 mb-6">Jalankan analisis PCA & K-Means terlebih dahulu untuk melihat hasil clustering.</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <Button onClick={handleRunAnalysis} disabled={runningAnalysis} className="bg-[#002C5F] hover:bg-[#003D7A]">
              {runningAnalysis ? <Skeleton className="h-4 w-4 mr-2 rounded-sm" /> : <Play className="h-4 w-4 mr-2" />}
              Jalankan Analisis
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const modeFromResult = clusterData.dataMode || 'panel';
  const uniqueProvinces = new Set(
    clusterData.summary.flatMap((item) => item.provinces)
  );
  const totalProvinces = uniqueProvinces.size;
  const totalObservations = Object.keys(clusterData.assignments).length;
  const observationLabel =
    modeFromResult === 'panel' ? 'Observasi Terklasifikasi' : 'Provinsi Terklasifikasi';
  const observationValue =
    modeFromResult === 'panel' ? totalObservations : totalProvinces;
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
      <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-[#002C5F]">
          Analisis K-Means Clustering
        </h2>
        <p className="text-gray-600 mt-2">
          Pengelompokan provinsi berdasarkan kesamaan karakteristik investasi dan pembangunan
        </p>
      </div>

      <Card className="border border-gray-200 bg-white">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Mode: {modeFromResult}</Badge>
              <Badge variant="secondary">k = {clusterData.k}</Badge>
              {modeFromResult === 'panel' && (
                <Badge variant="outline">Tahun: {yearRangeLabel}</Badge>
              )}
              {modeFromResult === 'panel' && panelStability && (
                <Badge variant="secondary">
                  Stabilitas Provinsi: {panelStabilityPercent}
                </Badge>
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                onClick={handleRunAnalysis}
                disabled={runningAnalysis}
                className="bg-[#002C5F] hover:bg-[#003D7A]"
              >
                {runningAnalysis ? (
                  <Skeleton className="h-4 w-4 mr-2 rounded-sm" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                Jalankan Ulang
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clustering Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white shadow-md border-2 border-gray-100">
          <CardContent className="p-6 text-center">
            <GitBranch className="h-10 w-10 text-[#002C5F] mx-auto mb-3" />
            <div className="text-3xl text-[#002C5F] mb-1">{clusterData.k}</div>
            <p className="text-sm text-gray-600">Total Klaster Terbentuk</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-2 border-gray-100">
          <CardContent className="p-6 text-center">
            <MapPin className="h-10 w-10 text-[#F9B233] mx-auto mb-3" />
            <div className="text-3xl text-[#002C5F] mb-1">{observationValue}</div>
            <p className="text-sm text-gray-600">{observationLabel}</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-2 border-gray-100">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-10 w-10 text-[#059669] mx-auto mb-3" />
            <div className="text-3xl text-[#002C5F] mb-1">
              {modeFromResult === 'panel' ? panelStabilityPercent : clusterData.metrics.silhouetteScore.toFixed(3)}
            </div>
            <p className="text-sm text-gray-600">
              {modeFromResult === 'panel' ? 'Stabilitas Provinsi' : 'Silhouette Score'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cluster Details */}
      {clusters.map((cluster) => (
        <Card 
          key={cluster.id} 
          className="border-l-4 shadow-lg bg-white"
          style={{ borderLeftColor: cluster.color }}
        >
          <CardHeader className="border-b border-gray-200 bg-linear-to-r from-gray-50 to-blue-50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: cluster.color }}
                />
                <div>
                  <CardTitle className="text-[#002C5F]">{cluster.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {modeFromResult === 'panel'
                      ? `${cluster.observationCount ?? cluster.count} Observasi (${cluster.count} Provinsi${
                          cluster.yearMin && cluster.yearMax ? `, ${cluster.yearMin}-${cluster.yearMax}` : ''
                        })`
                      : `${cluster.count} Provinsi dalam klaster ini`}
                  </CardDescription>
                </div>
              </div>
              <Badge 
                className="text-white"
                style={{ backgroundColor: cluster.color }}
              >
                Klaster {cluster.id + 1}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Metrics */}
            <div>
              <h4 className="text-[#002C5F] mb-3">Metrik Rata-rata</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">PDRB per Kapita</p>
                  <p className="text-lg text-[#002C5F]">Rp {cluster.avgPDRB.toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb</p>
                </div>
                <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">IPM Rata-rata</p>
                  <p className="text-lg text-[#002C5F]">{cluster.avgIPM.toFixed(1)}</p>
                </div>
                <div className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Investasi Avg (PMDN+PMA)</p>
                  <p className="text-lg text-[#002C5F]">Rp {(cluster.avgInvestment / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 })} T</p>
                </div>
              </div>
            </div>

            {/* Provinces */}
            <div>
              <h4 className="text-[#002C5F] mb-3">Daftar Provinsi</h4>
              <div className="flex flex-wrap gap-2">
                {cluster.provinces.map((province, idx) => (
                  <Badge 
                    key={idx} 
                    variant="outline"
                    className="px-3 py-1"
                    style={{ borderColor: cluster.color, color: cluster.color }}
                  >
                    {province}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
