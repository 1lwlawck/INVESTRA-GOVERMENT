import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import {
  Download,
  MapPin,
  GitBranch,
  TrendingUp,
  Calendar,
  Activity,
  Target,
  BarChart3,
  Play,
} from 'lucide-react';
import { InteractiveMap } from '@/components/organisms/charts/InteractiveMap';
import { PCAChart } from '@/components/organisms/charts/PCAChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { dashboardApi, type DashboardSummary } from '@/core/api/dashboard.api';
import { ApiError } from '@/core/api/http-client';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from '@/core/api/analysis.api';

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

export function DashboardPage() {
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
      avgIPM: s.statistics?.ipm ? s.statistics.ipm.mean.toFixed(1) : '-',
      avgInvestment:
        s.statistics?.pmdnRp && s.statistics?.fdiRp
          ? ((s.statistics.pmdnRp.mean + s.statistics.fdiRp.mean) / 1e12).toLocaleString('id-ID', {
              maximumFractionDigits: 2,
            }) + ' T'
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
        k: 3,
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
        {
          title: 'Total Provinsi Dianalisis',
          value: String(summary.totalProvinces),
          icon: MapPin,
          color: 'bg-[#002C5F]',
        },
        {
          title: 'Total Investasi',
          value: `Rp ${(summary.totalInvestment / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T`,
          icon: GitBranch,
          color: 'bg-[#F9B233]',
        },
        {
          title: 'Rata-rata IPM',
          value: summary.averageIpm.toFixed(2),
          icon: TrendingUp,
          color: 'bg-[#DC2626]',
        },
        {
          title: 'Rata-rata PDRB/Kapita',
          value: `Rp ${summary.averagePdrbPerKapita.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`,
          icon: Calendar,
          color: 'bg-[#059669]',
        },
      ]
    : [];
  const periodLabel = summary
    ? summary.datasetYearMin === summary.datasetYearMax
      ? String(summary.datasetYearMax)
      : `${summary.datasetYearMin}-${summary.datasetYearMax}`
    : '-';

  const evaluationMetrics = clusters
    ? [
        {
          title: 'Silhouette Score',
          value: clusters.metrics.silhouetteScore.toFixed(4),
          description: 'Kualitas clustering (0-1, semakin tinggi semakin baik)',
          icon: Activity,
          color: '#002C5F',
        },
        {
          title: 'Inertia',
          value: clusters.metrics.inertia.toLocaleString('id-ID', { maximumFractionDigits: 2 }),
          description: 'Jumlah kuadrat jarak sampai centroid terdekat',
          icon: Target,
          color: '#F9B233',
        },
        {
          title: 'Davies-Bouldin Index',
          value: clusters.metrics.daviesBouldin.toFixed(4),
          description: 'Rasio pemisahan cluster (semakin rendah semakin baik)',
          icon: BarChart3,
          color: '#DC2626',
        },
        {
          title: 'Calinski-Harabasz Index',
          value: clusters.metrics.calinskiHarabasz.toLocaleString('id-ID', {
            maximumFractionDigits: 2,
          }),
          description: 'Rasio dispersi antar dan dalam cluster (semakin tinggi semakin baik)',
          icon: TrendingUp,
          color: '#059669',
        },
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
        <Alert className="border-[#ff7759] bg-[#fff4f0]">
          <AlertDescription className="text-[#212121]">{error}</AlertDescription>
        </Alert>
        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-8 text-center">
          <h3
            className="mb-2 text-lg font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Dataset Belum Tersedia
          </h3>
          <p className="mb-6 text-[#616161]">
            Sistem belum memiliki dataset aktif untuk dianalisis.
          </p>
          <Button asChild className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]">
            <Link to="/dashboard/dataset">Buka Halaman Dataset</Link>
          </Button>
        </div>
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

      {/* Header Section */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[#d9d9dd] bg-white p-6 md:flex-row md:items-center">
        <div>
          <h1
            className="text-2xl font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Dashboard Analisis Ketimpangan Investasi
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Sistem Monitoring PCA &amp; K-Means Clustering
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#d9d9dd] bg-[#eeece7] px-4 py-2.5">
          <Calendar className="size-5 text-[#ff7759]" />
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
              Periode Data
            </p>
            <p className="text-sm font-medium text-[#17171c]">{periodLabel}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-2xl border border-[#d9d9dd] bg-white p-6 transition-all hover:border-[#93939f]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                    {card.title}
                  </p>
                  <h3
                    className="text-2xl font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    {card.value}
                  </h3>
                </div>
                <div className={`rounded-xl p-2.5 ${card.color} text-white`}>
                  <Icon className="size-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Evaluation Metrics */}
      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3
              className="text-lg font-normal tracking-tight text-[#17171c]"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              Metrik Evaluasi Clustering
            </h3>
            <p className="mt-1 text-sm text-[#616161]">Kualitas dan performa algoritma K-Means</p>
          </div>
          {clusters ? (
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#003c33] px-3 py-1 text-xs font-medium text-white">
                K-Means (k={clusters.k})
              </span>
              {strictStabilityText && (
                <span className="rounded-full bg-[#eeece7] px-3 py-1 text-xs font-medium text-[#212121]">
                  Stabilitas Ketat 3/3: {strictStabilityText} ({strictStabilityPercent})
                </span>
              )}
            </div>
          ) : (
            <Button
              onClick={handleRunAnalysis}
              disabled={analysisLoading}
              className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
            >
              {analysisLoading ? (
                <Skeleton className="mr-2 size-4 rounded-sm" />
              ) : (
                <Play className="mr-2 size-4" />
              )}
              Jalankan Analisis
            </Button>
          )}
        </div>
        {evaluationMetrics.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {evaluationMetrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div
                  key={metric.title}
                  className="rounded-xl border border-[#f2f2f2] bg-[#f7f6f3] p-4 transition-all hover:border-[#d9d9dd]"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div
                      className="rounded-lg border bg-white p-2"
                      style={{ borderColor: metric.color }}
                    >
                      <Icon className="size-5" style={{ color: metric.color }} />
                    </div>
                    <h4 className="text-sm font-medium text-[#17171c]">{metric.title}</h4>
                  </div>
                  <div className="mb-2">
                    <p
                      className="text-2xl font-normal tracking-tight"
                      style={{
                        color: metric.color,
                        fontFamily: "'Space Grotesk', 'Inter', sans-serif",
                      }}
                    >
                      {metric.value}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-[#616161]">{metric.description}</p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Activity className="size-12 mx-auto mb-3 opacity-30" />
            <p>
              Belum ada analisis yang dijalankan. Klik <strong>"Jalankan Analisis"</strong> untuk
              memulai.
            </p>
          </div>
        )}
      </div>

      {/* Cluster Summary Cards */}
      {clusterSummary.length > 0 && (
        <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3
                className="text-lg font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Ringkasan Klaster
              </h3>
              <p className="mt-1 text-sm text-[#616161]">
                Detail metrik dan karakteristik per klaster
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {clusterSummary.map((cluster) => (
              <div
                key={cluster.id}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-[#d9d9dd] bg-white transition-all hover:border-[#93939f]"
              >
                {/* color band */}
                <div className="h-1.5 w-full" style={{ backgroundColor: cluster.color }} />
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h4
                      className="text-base font-normal text-[#17171c]"
                      style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                    >
                      Klaster {cluster.id + 1}
                    </h4>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: cluster.color }}
                    >
                      {cluster.count} Provinsi
                    </span>
                  </div>
                  <p className="mb-4 text-xs font-medium" style={{ color: cluster.color }}>
                    {cluster.name}
                  </p>
                  <div className="mb-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#93939f]">PDRB Avg</span>
                      <span className="text-sm font-medium text-[#17171c]">
                        Rp {cluster.avgPDRB}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#93939f]">IPM Avg</span>
                      <span className="text-sm font-medium text-[#17171c]">{cluster.avgIPM}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#93939f]">Investasi Avg</span>
                      <span className="text-sm font-medium text-[#17171c]">
                        Rp {cluster.avgInvestment}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto border-t border-[#f2f2f2] pt-4">
                    <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                      Provinsi Utama
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.provinces.slice(0, 4).map((province) => (
                        <span
                          key={province}
                          className="rounded-full bg-[#eeece7] px-2 py-0.5 text-[11px] text-[#212121]"
                        >
                          {province}
                        </span>
                      ))}
                      {cluster.provinces.length > 4 && (
                        <span className="rounded-full bg-[#eeece7] px-2 py-0.5 text-[11px] text-[#93939f]">
                          +{cluster.provinces.length - 4}
                        </span>
                      )}
                    </div>
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
        <div className="space-y-6 lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white">
            <div className="flex items-center gap-2 border-b border-[#f2f2f2] px-6 py-4">
              <MapPin className="size-5 text-[#003c33]" />
              <h3
                className="font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Peta Persebaran Klaster
              </h3>
            </div>
            <div className="p-0">
              <Tabs defaultValue="map" className="w-full">
                <div className="border-b border-[#f2f2f2] px-6 py-2">
                  <TabsList className="bg-[#eeece7]">
                    <TabsTrigger
                      value="map"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      Peta Interaktif
                    </TabsTrigger>
                    <TabsTrigger
                      value="pca"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm"
                    >
                      Analisis PCA
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="map" className="m-0 min-h-125 p-6">
                  <InteractiveMap />
                </TabsContent>
                <TabsContent value="pca" className="m-0 min-h-125 p-6">
                  <PCAChart />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Right Column: Key Findings & Action */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white">
            <div className="flex items-center gap-2 border-b border-[#f2f2f2] px-6 py-4">
              <TrendingUp className="size-5 text-[#003c33]" />
              <h3
                className="font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                Temuan Utama
              </h3>
            </div>
            <div className="space-y-5 p-6">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff7759] text-[11px] font-medium text-white">
                  1
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#17171c]">Konsentrasi Jawa</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#616161]">
                    Investasi nasional masih terpusat di P. Jawa, menciptakan gap infrastruktur
                    signifikan.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#003c33] text-[11px] font-medium text-white">
                  2
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#17171c]">
                    Disparitas IPM &amp; Investasi
                  </h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#616161]">
                    IPM dan akses listrik berkorelasi kuat dengan tingkat investasi regional.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#17171c] text-[11px] font-medium text-white">
                  3
                </div>
                <div>
                  <h4 className="text-sm font-medium text-[#17171c]">3 Kelompok Investasi</h4>
                  <p className="mt-1 text-sm leading-relaxed text-[#616161]">
                    K-Means mengidentifikasi 3 kelompok provinsi berdasarkan tingkat investasi, dari
                    rendah hingga tinggi.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[#17171c] p-6 text-white">
            <h3
              className="mb-2 font-normal tracking-tight"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              Laporan Eksekutif
            </h3>
            <p className="mb-4 text-sm text-white/60">
              Unduh ringkasan lengkap untuk pemangku kebijakan.
            </p>
            <Button className="w-full rounded-full bg-white text-[#17171c] hover:bg-white/90">
              <Download className="mr-2 size-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Policy Recommendations */}
      <div>
        <h3
          className="mb-4 text-lg font-normal tracking-tight text-[#17171c]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Rekomendasi Kebijakan
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {policyInsights.slice(0, 3).map((insight) => (
            <div
              key={insight.cluster}
              className="flex h-full flex-col overflow-hidden rounded-xl border border-[#d9d9dd] bg-white transition-all hover:border-[#93939f]"
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: insight.color }} />
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs font-medium text-[#212121]">
                    Klaster {insight.cluster}
                  </span>
                </div>
                <h4
                  className="mb-2 text-base font-normal tracking-tight text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  {insight.title}
                </h4>
                <p className="text-sm leading-relaxed text-[#616161]">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
