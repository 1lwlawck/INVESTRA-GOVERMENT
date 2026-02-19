import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GitBranch, TrendingUp, MapPin, Play, BarChart3, CheckCircle } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  type EvaluateKItem,
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

      {/* Detailed Metrics Card */}
      <Card className="border border-gray-200 shadow-lg">
        <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-[#002C5F]" />
            <div>
              <CardTitle className="text-[#002C5F]">Metrik Evaluasi Clustering</CardTitle>
              <CardDescription>
                Ringkasan semua metrik kualitas clustering untuk K = {clusterData.k}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Silhouette Score</p>
              <p className="text-2xl font-bold text-[#059669] mb-1">{clusterData.metrics.silhouetteScore.toFixed(4)}</p>
              <p className="text-xs text-gray-500">Semakin tinggi semakin baik (max: 1)</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Davies-Bouldin Index</p>
              <p className="text-2xl font-bold text-[#002C5F] mb-1">{clusterData.metrics.daviesBouldin.toFixed(4)}</p>
              <p className="text-xs text-gray-500">Semakin rendah semakin baik (min: 0)</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
              <p className="text-xs text-gray-600 mb-1">Calinski-Harabasz Score</p>
              <p className="text-2xl font-bold text-purple-700 mb-1">{clusterData.metrics.calinskiHarabasz.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Semakin tinggi semakin baik</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Inertia</p>
              <p className="text-2xl font-bold text-[#F9B233] mb-1">{clusterData.metrics.inertia.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Semakin rendah semakin baik</p>
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Evaluation Matrix (K-Evaluation) */}
      {clusterData.kEvaluation && clusterData.kEvaluation.length > 0 && (
        <Card className="border border-gray-200 shadow-lg">
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-[#002C5F]" />
              <div>
                <CardTitle className="text-[#002C5F]">Matriks Evaluasi Clustering</CardTitle>
                <CardDescription>
                  Perbandingan metrik evaluasi untuk berbagai nilai K
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[#002C5F]">K</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Silhouette Score</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Davies-Bouldin</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Calinski-Harabasz</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Inertia</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Min Cluster Size</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-[#002C5F]">Valid</th>
                  </tr>
                </thead>
                <tbody>
                  {clusterData.kEvaluation.map((item: EvaluateKItem) => {
                    const isSelected = item.k === clusterData.k;
                    return (
                      <tr
                        key={item.k}
                        className={`border-b border-gray-200 ${isSelected ? 'bg-blue-50 font-semibold' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center gap-2">
                            <span className={isSelected ? 'text-[#002C5F]' : 'text-gray-700'}>{item.k}</span>
                            {isSelected && (
                              <CheckCircle className="h-4 w-4 text-[#059669]" />
                            )}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-center ${isSelected ? 'text-[#002C5F]' : 'text-gray-700'}`}>
                          {item.silhouetteScore.toFixed(4)}
                        </td>
                        <td className={`px-4 py-3 text-center ${isSelected ? 'text-[#002C5F]' : 'text-gray-700'}`}>
                          {item.daviesBouldin.toFixed(4)}
                        </td>
                        <td className={`px-4 py-3 text-center ${isSelected ? 'text-[#002C5F]' : 'text-gray-700'}`}>
                          {item.calinskiHarabasz.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-center ${isSelected ? 'text-[#002C5F]' : 'text-gray-700'}`}>
                          {item.inertia.toFixed(2)}
                        </td>
                        <td className={`px-4 py-3 text-center ${isSelected ? 'text-[#002C5F]' : 'text-gray-700'}`}>
                          {item.minClusterCount ?? 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {item.validMinCluster ? (
                            <Badge className="bg-[#059669] text-white">✓</Badge>
                          ) : (
                            <Badge variant="outline" className="border-gray-400 text-gray-600">✗</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-[#002C5F] mb-2">Penjelasan Metrik:</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li><strong>Silhouette Score:</strong> Mengukur seberapa mirip objek dengan klasternya sendiri dibanding klaster lain (rentang: -1 hingga 1, semakin tinggi semakin baik)</li>
                <li><strong>Davies-Bouldin Index:</strong> Mengukur rata-rata kesamaan antar klaster (semakin rendah semakin baik)</li>
                <li><strong>Calinski-Harabasz Score:</strong> Rasio dispersi antar-klaster dan dalam-klaster (semakin tinggi semakin baik)</li>
                <li><strong>Inertia:</strong> Jumlah jarak kuadrat sampel ke pusat klaster terdekat (semakin rendah semakin baik)</li>
                <li><strong>Min Cluster Size:</strong> Ukuran klaster terkecil untuk nilai K ini</li>
                <li><strong>Valid:</strong> Apakah semua klaster memenuhi ukuran minimum yang ditetapkan</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
