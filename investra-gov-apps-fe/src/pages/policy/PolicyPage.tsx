import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from '@/components/ui/button';
import { AlertCircle, BarChart3, Brain, Target } from 'lucide-react';
import { PolicyRecommendations } from '@/components/organisms/cards/PolicyRecommendations';
import { ProvinceRecommendations } from '@/components/organisms/cards/ProvinceRecommendations';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useState } from 'react';
import { analysisApi, type PolicyResult, CLUSTER_COLORS } from '@/core/api/analysis.api';
import { ApiError } from '@/core/api/http-client';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

export function PolicyPage() {
  useDocumentTitle('Rekomendasi Kebijakan');
  const [policy, setPolicy] = useState<PolicyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPolicy();
  }, []);

  const loadPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getPolicy();
      setPolicy(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'NO_ACTIVE_DATASET') {
          setError('Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
        } else if (err.code === 'POLICY_NOT_FOUND' || err.code === 'ANALYSIS_NOT_FOUND') {
          setError(
            'Belum ada hasil analisis. Jalankan analisis terlebih dahulu untuk menghasilkan rekomendasi.',
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Gagal memuat rekomendasi. Pastikan analisis sudah dijalankan.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <BasicPageSkeleton cardCount={4} contentBlockCount={2} />;
  }

  if (error || !policy) {
    return (
      <div className="space-y-6">
        <Card className="rounded-2xl border border-[#d9d9dd] bg-white">
          <CardContent className="p-8 text-center">
            <AlertCircle className="size-10 text-[#ff7759] mx-auto mb-3" />
            <p
              className="text-[#17171c] mb-2 text-lg font-normal tracking-tight"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              {error || 'Data rekomendasi tidak tersedia'}
            </p>
            <p className="text-[#616161] text-sm mb-4">
              Jalankan analisis PCA + K-Means terlebih dahulu untuk menghasilkan rekomendasi
              kebijakan berbasis data.
            </p>
            <Button
              onClick={loadPolicy}
              className="rounded-full bg-[#17171c] text-white hover:bg-[#2a2a32]"
            >
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#d9d9dd] p-6">
        <p
          className="text-xs uppercase tracking-[0.18em] text-[#ff7759] mb-2"
          style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
        >
          Rekomendasi Kebijakan
        </p>
        <h2
          className="text-[#17171c] text-xl font-normal tracking-tight"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Rekomendasi Kebijakan Regional
        </h2>
        <p className="text-[#616161] mt-2">
          Arah kebijakan berbasis data dari hasil clustering K-Means dan analisis PCA —{' '}
          {policy.metadata.k} kelompok
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-[#93939f]">
          <span className="flex items-center gap-1">
            <BarChart3 className="size-3.5" />
            Metode: Ratio-Based Thresholding + Rule Engine
          </span>
          <span className="flex items-center gap-1">
            <Brain className="size-3.5" />
            Input: Cluster Summary + PCA Loadings + National Average
          </span>
        </div>
      </div>

      {/* Cluster Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {policy.clusterPolicies.map((cp) => (
          <Card
            key={cp.clusterId}
            className="overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white p-0 transition-colors hover:border-[#93939f] flex h-full flex-col"
          >
            <div
              className="h-1.5 w-full"
              style={{ backgroundColor: CLUSTER_COLORS[cp.clusterId] || '#003c33' }}
            />
            <CardHeader className="pb-2 pt-4">
              <div className="flex items-center gap-2">
                <div
                  className="size-4 rounded-full"
                  style={{ backgroundColor: CLUSTER_COLORS[cp.clusterId] || '#003c33' }}
                />
                <CardTitle
                  className="text-sm text-[#17171c] font-normal tracking-tight"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  {cp.label}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0 mt-auto">
              <p
                className="text-2xl font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                {cp.count} <span className="text-sm font-normal text-[#93939f]">provinsi</span>
              </p>
              <div className="flex items-center gap-1 mt-1">
                <Target className="size-3 text-[#93939f]" />
                <p className="text-xs text-[#616161] truncate">{cp.dominantFactor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PCA Interpretation */}
      {policy.pcaInterpretation.length > 0 && (
        <Card className="rounded-2xl border border-[#d9d9dd] bg-[#f7f6f3]">
          <CardHeader>
            <CardTitle
              className="text-[#17171c] text-base font-normal tracking-tight"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              Interpretasi PCA — Dimensi Dominan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policy.pcaInterpretation.map((pc) => (
                <div key={pc.component} className="bg-white rounded-xl p-4 border border-[#f2f2f2]">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="text-sm text-[#17171c] font-normal tracking-tight"
                      style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                    >
                      {pc.component}
                    </span>
                    <span className="text-xs bg-[#edfce9] text-[#003c33] px-2.5 py-0.5 rounded-full">
                      {pc.dimension}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {pc.dominantVariables.map((v) => (
                      <div key={v.variable} className="flex items-center justify-between text-xs">
                        <span className="text-[#616161]">{v.label}</span>
                        <span
                          className={`font-mono ${v.loading > 0 ? 'text-[#003c33]' : 'text-[#ff7759]'}`}
                        >
                          {v.loading > 0 ? '+' : ''}
                          {v.loading.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabbed content */}
      <Tabs defaultValue="cluster" className="w-full">
        <TabsList className="flex w-full overflow-x-auto bg-[#eeece7] p-1 gap-1 rounded-full">
          <TabsTrigger
            value="cluster"
            className="flex-1 min-w-30 text-xs sm:text-sm rounded-full data-[state=active]:bg-white data-[state=active]:text-[#17171c]"
          >
            Per Klaster
          </TabsTrigger>
          <TabsTrigger
            value="province"
            className="flex-1 min-w-30 text-xs sm:text-sm rounded-full data-[state=active]:bg-white data-[state=active]:text-[#17171c]"
          >
            Per Provinsi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cluster" className="mt-6">
          <PolicyRecommendations policy={policy} />
        </TabsContent>

        <TabsContent value="province" className="mt-6">
          <ProvinceRecommendations policy={policy} />
        </TabsContent>
      </Tabs>

      {/* Methodology note */}
      <Card className="rounded-2xl border border-[#d9d9dd] bg-[#f7f6f3]">
        <CardContent className="p-5">
          <h4
            className="text-[#17171c] font-normal tracking-tight text-sm mb-2"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Metodologi Rekomendasi
          </h4>
          <ol className="text-xs text-[#616161] space-y-1 list-decimal list-inside">
            <li>
              <strong className="text-[#212121]">Klasifikasi Relatif:</strong> Rata-rata klaster
              dibandingkan rata-rata nasional menggunakan rasio (cluster_mean / national_mean).
            </li>
            <li>
              <strong className="text-[#212121]">Threshold:</strong>{' '}
              {
                'Rasio < 0.50 = Sangat Rendah, 0.50–0.90 = Rendah, 0.90–1.10 = Rata-rata, 1.10–1.50 = Tinggi, ≥ 1.50 = Sangat Tinggi.'
              }
            </li>
            <li>
              <strong className="text-[#212121]">Indikator Inversi:</strong> Untuk kemiskinan dan
              TPT, rasio tinggi = kondisi buruk (interpretasi dibalik).
            </li>
            <li>
              <strong className="text-[#212121]">Rule Engine:</strong> Kombinasi kategori variabel
              dievaluasi terhadap aturan kebijakan yang telah didefinisikan.
            </li>
            <li>
              <strong className="text-[#212121]">PCA:</strong> Loading faktor PC1 dan PC2 digunakan
              untuk mengidentifikasi dimensi ekonomi dominan.
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
