import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, TrendingUp, MapPin, Play } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
} from "@/core/api/analysis.api";
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

interface ClusterCard {
  id: number;
  name: string;
  color: string;
  count: number;
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

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getClusters();
      setClusterData(data);
      buildClustersFromSummary(data);
    } catch {
      setClusterData(null);
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
        autoK: true,
        kMin: 2,
        kMax: 8,
        minClusterSize: 3,
      });
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menjalankan analisis');
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

  const totalProvinces = Object.keys(clusterData.assignments).length;

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
            <div className="text-3xl text-[#002C5F] mb-1">{totalProvinces}</div>
            <p className="text-sm text-gray-600">Provinsi Terklasifikasi</p>
          </CardContent>
        </Card>

        <Card className="bg-white shadow-md border-2 border-gray-100">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-10 w-10 text-[#059669] mx-auto mb-3" />
            <div className="text-3xl text-[#002C5F] mb-1">{clusterData.metrics.silhouetteScore.toFixed(3)}</div>
            <p className="text-sm text-gray-600">Silhouette Score</p>
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
                    {cluster.count} Provinsi dalam klaster ini
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
