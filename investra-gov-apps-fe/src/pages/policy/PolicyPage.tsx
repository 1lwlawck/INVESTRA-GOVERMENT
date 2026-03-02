import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, Brain, Target } from "lucide-react";
import { PolicyRecommendations } from "@/components/organisms/cards/PolicyRecommendations";
import { ProvinceRecommendations } from "@/components/organisms/cards/ProvinceRecommendations";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import {
  analysisApi,
  type PolicyResult,
  CLUSTER_COLORS,
} from "@/core/api/analysis.api";
import { ApiError } from '@/core/api/http-client';
import { BasicPageSkeleton } from "@/components/organisms/loading/PageSkeleton";

export function PolicyView() {
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
          setError('Belum ada hasil analisis. Jalankan analisis terlebih dahulu untuk menghasilkan rekomendasi.');
        } else {
          setError(err.message);
        }
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Gagal memuat rekomendasi. Pastikan analisis sudah dijalankan."
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
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-700 font-medium mb-2">
              {error || "Data rekomendasi tidak tersedia"}
            </p>
            <p className="text-red-500 text-sm mb-4">
              Jalankan analisis PCA + K-Means terlebih dahulu untuk menghasilkan rekomendasi kebijakan berbasis data.
            </p>
            <Button onClick={loadPolicy} variant="outline" className="border-red-300 text-red-700">
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
      <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-[#002C5F] text-xl font-bold">Rekomendasi Kebijakan Regional</h2>
        <p className="text-gray-600 mt-2">
          Arah kebijakan berbasis data dari hasil clustering K-Means dan analisis PCA — {policy.metadata.k} klaster
        </p>
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <BarChart3 className="h-3.5 w-3.5" />
            Metode: Ratio-Based Thresholding + Rule Engine
          </span>
          <span className="flex items-center gap-1">
            <Brain className="h-3.5 w-3.5" />
            Input: Cluster Summary + PCA Loadings + National Average
          </span>
        </div>
      </div>

      {/* Cluster Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {policy.clusterPolicies.map((cp) => (
          <Card
            key={cp.clusterId}
            className="border-2 hover:shadow-lg transition-all bg-white"
            style={{ borderColor: CLUSTER_COLORS[cp.clusterId] || "#6B7280" }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: CLUSTER_COLORS[cp.clusterId] || "#6B7280" }}
                />
                <CardTitle className="text-sm text-[#002C5F]">{cp.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-bold text-[#002C5F]">{cp.count} <span className="text-sm font-normal text-gray-500">provinsi</span></p>
              <div className="flex items-center gap-1 mt-1">
                <Target className="h-3 w-3 text-gray-400" />
                <p className="text-xs text-gray-500 truncate">{cp.dominantFactor}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PCA Interpretation */}
      {policy.pcaInterpretation.length > 0 && (
        <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-200">
          <CardHeader>
            <CardTitle className="text-[#002C5F] text-base">Interpretasi PCA — Dimensi Dominan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policy.pcaInterpretation.map((pc) => (
                <div key={pc.component} className="bg-white rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-bold text-[#002C5F]">{pc.component}</span>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{pc.dimension}</span>
                  </div>
                  <div className="space-y-1">
                    {pc.dominantVariables.map((v) => (
                      <div key={v.variable} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{v.label}</span>
                        <span className={`font-mono ${v.loading > 0 ? "text-green-600" : "text-red-600"}`}>
                          {v.loading > 0 ? "+" : ""}{v.loading.toFixed(3)}
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
        <TabsList className="flex w-full overflow-x-auto bg-gray-100 p-1 gap-1">
          <TabsTrigger
            value="cluster"
            className="flex-1 min-w-30 text-xs sm:text-sm data-[state=active]:bg-[#002C5F] data-[state=active]:text-white"
          >
            Per Klaster
          </TabsTrigger>
          <TabsTrigger
            value="province"
            className="flex-1 min-w-30 text-xs sm:text-sm data-[state=active]:bg-[#002C5F] data-[state=active]:text-white"
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
      <Card className="bg-gray-50 border border-gray-200">
        <CardContent className="p-5">
          <h4 className="text-[#002C5F] font-semibold text-sm mb-2">Metodologi Rekomendasi</h4>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li><strong>Klasifikasi Relatif:</strong> Rata-rata klaster dibandingkan rata-rata nasional menggunakan rasio (cluster_mean / national_mean).</li>
            <li><strong>Threshold:</strong> {"Rasio < 0.50 = Sangat Rendah, 0.50–0.90 = Rendah, 0.90–1.10 = Rata-rata, 1.10–1.50 = Tinggi, ≥ 1.50 = Sangat Tinggi."}</li>
            <li><strong>Indikator Inversi:</strong> Untuk kemiskinan dan TPT, rasio tinggi = kondisi buruk (interpretasi dibalik).</li>
            <li><strong>Rule Engine:</strong> Kombinasi kategori variabel dievaluasi terhadap aturan kebijakan yang telah didefinisikan.</li>
            <li><strong>PCA:</strong> Loading faktor PC1 dan PC2 digunakan untuk mengidentifikasi dimensi ekonomi dominan.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
