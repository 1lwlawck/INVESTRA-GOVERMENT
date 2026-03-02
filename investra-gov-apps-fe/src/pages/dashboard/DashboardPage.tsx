import { useState, useEffect } from "react";
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, MapPin, GitBranch, TrendingUp, Calendar, Activity, Target, BarChart3, Play } from 'lucide-react';
import { InteractiveMap } from "@/components/organisms/charts/InteractiveMap";
import { PCAChart } from "@/components/organisms/charts/PCAChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { dashboardApi, type DashboardSummary } from "@/core/api/dashboard.api";
import { ApiError } from '@/core/api/http-client';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from "@/core/api/analysis.api";

interface ClusterSummaryCard {
  id: number;
  name: string;
  color: string;
  count: number;
  avgPDRB: string;
  avgIPM: string;
  avgInvestment: string;
  provinces: string[];
}

export function DashboardView() {
  useDocumentTitle('Dashboard');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [clusters, setClusters] = useState<ClusterResult | null>(null);
  const [clusterSummary, setClusterSummary] = useState<ClusterSummaryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noActiveDataset, setNoActiveDataset] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setNoActiveDataset(false);
    try {
      const summaryData = await dashboardApi.getSummary();
      setSummary(summaryData);

      try {
        const clusterData = await analysisApi.getClusters();
        setClusters(clusterData);
        buildClusterCards(clusterData);
      } catch {
        setClusters(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NO_ACTIVE_DATASET') {
        setNoActiveDataset(true);
        setSummary(null);
        setClusters(null);
        setClusterSummary([]);
        setError('Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  /** Build cluster summary cards directly from backend summary */
  const buildClusterCards = (clusterData: ClusterResult) => {
    if (!clusterData.summary || clusterData.summary.length === 0) return;

    const items: ClusterSummaryCard[] = clusterData.summary.map((s: ClusterSummaryItem) => ({
      id: s.cluster,
      name: s.label,
      color: CLUSTER_COLORS[s.cluster] || '#6B7280',
      count: s.count,
      avgPDRB: s.statistics?.pdrbPerKapita
        ? s.statistics.pdrbPerKapita.mean.toLocaleString('id-ID', { maximumFractionDigits: 1 })
        : '-',
      avgIPM: s.statistics?.ipm
        ? s.statistics.ipm.mean.toFixed(1)
        : '-',
      avgInvestment: s.statistics?.pmdnRp && s.statistics?.fdiRp
        ? ((s.statistics.pmdnRp.mean + s.statistics.fdiRp.mean) / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' T'
        : '-',
      provinces: [...s.provinces].sort(),
    }));

    setClusterSummary(items);
  };

  const handleRunAnalysis = async () => {
    setAnalysisLoading(true);
    setError(null);
    try {
      await analysisApi.run({
        autoK: false,
        k: 4,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menjalankan analisis');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const summaryCards = summary
    ? [
        { title: 'Total Provinsi Dianalisis', value: String(summary.totalProvinces), icon: MapPin, color: 'bg-[#002C5F]' },
        { title: 'Total Investasi', value: `Rp ${(summary.totalInvestment / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`, icon: GitBranch, color: 'bg-[#F9B233]' },
        { title: 'Rata-rata IPM', value: summary.averageIpm.toFixed(2), icon: TrendingUp, color: 'bg-[#DC2626]' },
        { title: 'Rata-rata PDRB/Kapita', value: `Rp ${summary.averagePdrbPerKapita.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`, icon: Calendar, color: 'bg-[#059669]' },
      ]
    : [];
  const periodLabel = summary
    ? (summary.datasetYearMin === summary.datasetYearMax
      ? String(summary.datasetYearMax)
      : `${summary.datasetYearMin}-${summary.datasetYearMax}`)
    : '-';

  const evaluationMetrics = clusters
    ? [
        { title: 'Silhouette Score', value: clusters.metrics.silhouetteScore.toFixed(4), description: 'Kualitas clustering (0-1, semakin tinggi semakin baik)', icon: Activity, color: '#002C5F' },
        { title: 'Inertia', value: clusters.metrics.inertia.toLocaleString('id-ID', { maximumFractionDigits: 2 }), description: 'Jumlah kuadrat jarak sampai centroid terdekat', icon: Target, color: '#F9B233' },
        { title: 'Davies-Bouldin Index', value: clusters.metrics.daviesBouldin.toFixed(4), description: 'Rasio pemisahan cluster (semakin rendah semakin baik)', icon: BarChart3, color: '#DC2626' },
        { title: 'Calinski-Harabasz Index', value: clusters.metrics.calinskiHarabasz.toLocaleString('id-ID', { maximumFractionDigits: 2 }), description: 'Rasio dispersi antar dan dalam cluster (semakin tinggi semakin baik)', icon: TrendingUp, color: '#059669' },
      ]
    : [];
  const panelStability = clusters?.panelStability ?? null;
  const strictStabilityText = panelStability
    ? `${panelStability.strictStableProvinceCount}/${panelStability.provinceCount} provinsi`
    : null;
  const strictStabilityPercent = panelStability
    ? `${(panelStability.strictStabilityRatio * 100).toFixed(1)}%`
    : null;

  const POLICY_DESCRIPTIONS: Record<number, string> = {
    0: 'Kelola desentralisasi investasi dari kawasan terkonsentrasi untuk mendukung pemerataan pembangunan nasional.',
    1: 'Dorong diversifikasi sektor industri dan peningkatan kualitas SDM untuk mempertahankan pertumbuhan.',
    2: 'Perkuat konektivitas logistik dan akses pasar untuk meningkatkan daya saing daerah berkembang.',
    3: 'Berikan insentif fiskal, pelatihan SDM, dan perbaikan infrastruktur dasar untuk menarik investasi ke daerah tertinggal.',
  };

  const policyInsights = Object.keys(CLUSTER_LABELS).map((key) => {
    const id = Number(key);
    return {
      cluster: id + 1,
      title: CLUSTER_LABELS[id],
      description: POLICY_DESCRIPTIONS[id] || '',
      color: CLUSTER_COLORS[id],
    };
  });

  if (loading) {
    return <BasicPageSkeleton cardCount={4} contentBlockCount={3} />;
  }

  if (noActiveDataset) {
    return (
      <div className="space-y-6">
        <Alert className="border-amber-500 bg-amber-50">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Card className="border border-gray-200">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-[#002C5F] mb-2">Dataset Belum Tersedia</h3>
            <p className="text-gray-600 mb-6">
              Sistem belum memiliki dataset aktif untuk dianalisis.
            </p>
            <Button asChild className="bg-[#002C5F] hover:bg-[#003D7A]">
              <Link to="/dashboard/dataset">Buka Halaman Dataset</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header Section - Clean & Professional */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#002C5F]">
            Dashboard Analisis Ketimpangan Investasi
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Sistem Monitoring PCA & K-Means Clustering
          </p>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
           <Calendar className="w-5 h-5 text-[#F9B233]" />
           <div>
             <p className="text-xs text-gray-500">Periode Data</p>
             <p className="text-sm font-semibold text-[#002C5F]">{periodLabel}</p>
           </div>
        </div>
      </div>

      {/* Summary Cards - Solid & Clear */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                    <h3 className="text-2xl font-bold text-[#002C5F]">{card.value}</h3>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                     <div className={`p-2 rounded-md ${card.color} text-white`}>
                        <Icon className="h-5 w-5" />
                     </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Evaluation Metrics */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#002C5F]">Metrik Evaluasi Clustering</h3>
            <p className="text-sm text-gray-600 mt-1">Kualitas dan performa algoritma K-Means</p>
          </div>
          {clusters ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-[#059669] text-white">K-Means (k={clusters.k})</Badge>
              {strictStabilityText && (
                <Badge variant="secondary">
                  Stabilitas Ketat 3/3: {strictStabilityText} ({strictStabilityPercent})
                </Badge>
              )}
            </div>
          ) : (
            <Button onClick={handleRunAnalysis} disabled={analysisLoading} className="bg-[#002C5F] hover:bg-[#003D7A]">
              {analysisLoading ? <Skeleton className="h-4 w-4 mr-2 rounded-sm" /> : <Play className="h-4 w-4 mr-2" />}
              Jalankan Analisis
            </Button>
          )}
        </div>
        {evaluationMetrics.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {evaluationMetrics.map((metric, index) => {
              const Icon = metric.icon;
              return (
                <div key={index} className="p-4 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-white border-2" style={{ borderColor: metric.color }}>
                      <Icon className="h-5 w-5" style={{ color: metric.color }} />
                    </div>
                    <h4 className="font-semibold text-[#002C5F] text-sm">{metric.title}</h4>
                  </div>
                  <div className="mb-2">
                    <p className="text-2xl font-bold" style={{ color: metric.color }}>{metric.value}</p>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{metric.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Belum ada analisis yang dijalankan. Klik <strong>"Jalankan Analisis"</strong> untuk memulai.</p>
          </div>
        )}
      </div>

      {/* Cluster Summary Cards */}
      {clusterSummary.length > 0 && (
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[#002C5F]">Ringkasan Klaster</h3>
            <p className="text-sm text-gray-600 mt-1">Detail metrik dan karakteristik per klaster</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {clusterSummary.map((cluster) => (
            <div key={cluster.id} className="p-5 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border-2 hover:shadow-lg transition-all" style={{ borderColor: cluster.color }}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cluster.color }}></div>
                  <h4 className="font-bold text-[#002C5F]">Klaster {cluster.id + 1}</h4>
                </div>
                <Badge className="text-white" style={{ backgroundColor: cluster.color }}>
                  {cluster.count} Provinsi
                </Badge>
              </div>
              <p className="text-xs font-semibold mb-3" style={{ color: cluster.color }}>{cluster.name}</p>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">PDRB Avg</span>
                  <span className="text-sm font-semibold text-[#002C5F]">Rp {cluster.avgPDRB}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">IPM Avg</span>
                  <span className="text-sm font-semibold text-[#002C5F]">{cluster.avgIPM}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Investasi Avg</span>
                  <span className="text-sm font-semibold text-[#002C5F]">Rp {cluster.avgInvestment}</span>
                </div>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Provinsi Utama:</p>
                <div className="flex flex-wrap gap-1">
                  {cluster.provinces.slice(0, 4).map((province, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs" style={{ borderColor: cluster.color, color: cluster.color }}>
                      {province}
                    </Badge>
                  ))}
                  {cluster.provinces.length > 4 && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: cluster.color, color: cluster.color }}>
                      +{cluster.provinces.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Interactive Map & Charts */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#002C5F]" />
                <h3 className="font-semibold text-[#002C5F]">Peta Persebaran Klaster</h3>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <Tabs defaultValue="map" className="w-full">
                 <div className="border-b border-gray-100 px-6 py-2">
                    <TabsList className="bg-gray-100">
                      <TabsTrigger value="map" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Peta Interaktif</TabsTrigger>
                      <TabsTrigger value="pca" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Analisis PCA</TabsTrigger>
                    </TabsList>
                 </div>
                 <TabsContent value="map" className="m-0 p-6 min-h-125">
                   <InteractiveMap />
                 </TabsContent>
                 <TabsContent value="pca" className="m-0 p-6 min-h-125">
                   <PCAChart />
                 </TabsContent>
               </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Key Findings & Action */}
        <div className="space-y-6">
           <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 py-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#002C5F]" />
                <h3 className="font-semibold text-[#002C5F]">Temuan Utama</h3>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3 items-start">
                <div className="mt-1 min-w-1 h-12 bg-[#DC2626] rounded-full"></div>
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">Konsentrasi Jawa</h4>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    Investasi nasional masih terpusat di P. Jawa, menciptakan gap infrastruktur signifikan.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-1 min-w-1 h-12 bg-[#F9B233] rounded-full"></div>
                <div>
                   <h4 className="font-semibold text-gray-900 text-sm">Disparitas IPM & Investasi</h4>
                   <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                     IPM dan akses listrik berkorelasi kuat dengan tingkat investasi regional.
                   </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="mt-1 min-w-1 h-12 bg-[#002C5F] rounded-full"></div>
                <div>
                   <h4 className="font-semibold text-gray-900 text-sm">4 Klaster Investasi</h4>
                   <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                     K-Means mengidentifikasi 4 kelompok provinsi berdasarkan tingkat investasi, dari rendah hingga sangat tinggi.
                   </p>
                </div>
              </div>
            </CardContent>
           </Card>

           <Card className="bg-[#002C5F] text-white">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Laporan Eksekutif</h3>
                <p className="text-blue-100 text-sm mb-4">
                  Unduh ringkasan lengkap untuk pemangku kebijakan.
                </p>
                <Button className="w-full bg-[#F9B233] hover:bg-[#e0a02e] text-[#002C5F] font-bold">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </CardContent>
           </Card>
        </div>
      </div>
      
      {/* Detailed Clusters - Clean Cards */}
      <div>
        <h3 className="text-lg font-bold text-[#002C5F] mb-4">Rekomendasi Kebijakan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {policyInsights.map((insight) => (
                <Card 
                key={insight.cluster} 
                className="border border-gray-200 shadow-sm hover:border-[#002C5F] transition-colors bg-white"
                >
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                        Klaster {insight.cluster}
                    </Badge>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: insight.color }}></div>
                    </div>
                    <CardTitle className="text-base font-bold text-[#002C5F]">
                    {insight.title}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">
                    {insight.description}
                    </p>
                </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </div>
  );
}
