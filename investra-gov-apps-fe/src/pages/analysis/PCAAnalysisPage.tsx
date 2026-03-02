import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PCAChart } from "@/components/organisms/charts/PCAChart";
import { TrendingUp, Info, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { analysisApi, type PCAResult, FEATURE_LABELS } from "@/core/api/analysis.api";
import { ApiError } from '@/core/api/http-client';
import { CHART_PALETTE } from '@/shared/constants';
import { Skeleton } from "@/components/ui/skeleton";
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

export function PCAAnalysisView() {
  useDocumentTitle('Analisis PCA');
  const [pcaData, setPcaData] = useState<PCAResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningAnalysis, setRunningAnalysis] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPCA();
  }, []);

  const loadPCA = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analysisApi.getPCA();
      setPcaData(data);
    } catch (err) {
      setPcaData(null);
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
      setError(err instanceof Error ? err.message : 'Gagal memuat data PCA');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setRunningAnalysis(true);
    setError(null);
    try {
      await analysisApi.run({
        autoK: false,
        k: 4,
      });
      await loadPCA();
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

  // Derive summary from real data
  const pcaSummary = pcaData
    ? pcaData.explainedVariance.map((ev, idx) => {
        // Find the dominant feature for this component from loadings
        const pcKey = `PC${ev.component}`;
        const loadingMap = pcaData.loadings[pcKey] || {};
        const dominantFeature = Object.entries(loadingMap).sort(
          ([, a], [, b]) => Math.abs(b) - Math.abs(a)
        )[0];

        return {
          component: pcKey,
          variance: `${(ev.variance * 100).toFixed(1)}%`,
          cumulative: `${(ev.cumulative * 100).toFixed(1)}%`,
          description: dominantFeature
            ? `Didominasi oleh ${FEATURE_LABELS[dominantFeature[0]] || dominantFeature[0]} (loading: ${dominantFeature[1].toFixed(2)})`
            : 'Komponen analisis',
          color: CHART_PALETTE[idx] || '#6B7280',
        };
      })
    : [];

  if (loading) {
    return <BasicPageSkeleton cardCount={4} contentBlockCount={2} />;
  }

  if (!pcaData) {
    return (
      <div className="space-y-6">
        <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-[#002C5F]">Analisis Principal Component Analysis (PCA)</h2>
          <p className="text-gray-600 mt-2">Reduksi dimensi dan identifikasi faktor dominan</p>
        </div>
        <Card className="border border-gray-200">
          <CardContent className="p-12 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Belum Ada Analisis</h3>
            <p className="text-gray-500 mb-6">Jalankan analisis PCA & K-Means terlebih dahulu untuk melihat hasil.</p>
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

  // Build interpretation items from PCA loadings
  const interpretations = pcaSummary.slice(0, 3).map((item) => {
    const pcKey = item.component;
    const loadingMap = pcaData.loadings[pcKey] || {};
    const sortedLoadings = Object.entries(loadingMap)
      .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
      .slice(0, 3);

    const loadingStr = sortedLoadings
      .map(([feat, val]) => `${FEATURE_LABELS[feat] || feat} (${val.toFixed(2)})`)
      .join(', ');

    return {
      ...item,
      loadingDescription: `${pcKey} didominasi oleh ${loadingStr}. Komponen ini menjelaskan ${item.variance} varians total.`,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-[#002C5F]">
          Analisis Principal Component Analysis (PCA)
        </h2>
        <p className="text-gray-600 mt-2">
          Reduksi dimensi dan identifikasi faktor dominan yang mempengaruhi ketimpangan investasi
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pcaSummary.slice(0, 4).map((item, index) => (
          <Card 
            key={index} 
            className="border-l-4 hover:shadow-lg transition-all bg-white"
            style={{ borderLeftColor: item.color }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-[#002C5F] text-lg">{item.component}</CardTitle>
              <CardDescription>Varians: {item.variance} (Kumulatif: {item.cumulative})</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <Alert className="bg-blue-50 border-[#002C5F]">
        <Info className="h-4 w-4 text-[#002C5F]" />
        <AlertTitle className="text-[#002C5F]">Tentang PCA</AlertTitle>
        <AlertDescription className="text-gray-700">
          Principal Component Analysis (PCA) adalah metode statistik untuk mereduksi dimensionalitas data dengan mempertahankan sebanyak mungkin variasi. 
          Dalam analisis ini, {pcaSummary.length} komponen utama menjelaskan 100% varians total dari {Object.keys(pcaData.loadings['PC1'] || {}).length} variabel asli.
        </AlertDescription>
      </Alert>

      {/* PCA Visualization */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F]">Visualisasi Hasil PCA</CardTitle>
          <CardDescription>Grafik loading faktor dan explained variance</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <PCAChart />
        </CardContent>
      </Card>

      {/* Interpretation */}
      <Card className="bg-linear-to-br from-blue-50 to-gray-50 border-2 border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-[#002C5F] flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#F9B233]" />
            Interpretasi Hasil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interpretations.map((item, idx) => (
            <div key={idx} className="p-5 bg-white rounded-lg border-l-4" style={{ borderLeftColor: item.color }}>
              <h4 className="text-[#002C5F] mb-2">{item.component} - {item.variance}</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{item.loadingDescription}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
