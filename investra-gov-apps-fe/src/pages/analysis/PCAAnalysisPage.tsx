import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PCAChart } from '@/components/organisms/charts/PCAChart';
import { TrendingUp, Info, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { analysisApi, type PCAResult, FEATURE_LABELS } from '@/core/api/analysis.api';
import { ApiError } from '@/core/api/http-client';
import { CHART_PALETTE } from '@/shared/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

export function PCAAnalysisPage() {
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
        k: 3,
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
        const dominantFeature = Object.entries(loadingMap).reduce<[string, number] | undefined>(
          (max, cur) => (max === undefined || Math.abs(cur[1]) > Math.abs(max[1]) ? cur : max),
          undefined,
        );

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
        <div>
          <p
            className="mb-2 text-xs uppercase tracking-[0.18em] text-[#ff7759]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
          >
            Analisis
          </p>
          <h2
            className="text-2xl font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Analisis Principal Component Analysis (PCA)
          </h2>
          <p className="mt-2 text-[#616161]">Reduksi dimensi dan identifikasi faktor dominan</p>
        </div>
        <Card className="rounded-2xl border border-[#d9d9dd] bg-white">
          <CardContent className="p-12 text-center">
            <TrendingUp className="size-16 mx-auto mb-4 text-[#93939f]" />
            <h3
              className="text-lg font-normal tracking-tight text-[#17171c] mb-2"
              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
            >
              Belum Ada Analisis
            </h3>
            <p className="text-[#616161] mb-6">
              Jalankan analisis PCA & K-Means terlebih dahulu untuk melihat hasil.
            </p>
            {error && <p className="text-[#ff7759] text-sm mb-4">{error}</p>}
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
      <div>
        <p
          className="mb-2 text-xs uppercase tracking-[0.18em] text-[#ff7759]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
        >
          Analisis
        </p>
        <h2
          className="text-2xl font-normal tracking-tight text-[#17171c]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Analisis Principal Component Analysis (PCA)
        </h2>
        <p className="mt-2 text-[#616161]">
          Reduksi dimensi dan identifikasi faktor dominan yang mempengaruhi ketimpangan investasi
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pcaSummary.slice(0, 4).map((item) => (
          <Card
            key={item.component}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white transition-colors hover:border-[#93939f]"
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: item.color }} />
            <CardHeader className="pb-3">
              <CardTitle
                className="text-lg font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                {item.component}
              </CardTitle>
              <CardDescription className="text-[#616161]">
                Varians: {item.variance} (Kumulatif: {item.cumulative})
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto">
              <p className="text-sm text-[#616161] leading-relaxed">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Alert */}
      <Alert className="rounded-2xl border border-[#d9d9dd] bg-[#edfce9]">
        <Info className="size-4 text-[#003c33]" />
        <AlertTitle
          className="font-normal tracking-tight text-[#003c33]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Tentang PCA
        </AlertTitle>
        <AlertDescription className="text-[#003c33]">
          Principal Component Analysis (PCA) adalah metode statistik untuk mereduksi dimensionalitas
          data dengan mempertahankan sebanyak mungkin variasi. Dalam analisis ini,{' '}
          {pcaSummary.length} komponen utama menjelaskan 100% varians total dari{' '}
          {Object.keys(pcaData.loadings['PC1'] || {}).length} variabel asli.
        </AlertDescription>
      </Alert>

      {/* PCA Visualization */}
      <Card className="rounded-2xl border border-[#d9d9dd] bg-white">
        <CardHeader className="border-b border-[#d9d9dd] bg-[#f7f6f3] rounded-t-2xl">
          <CardTitle
            className="font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Visualisasi Hasil PCA
          </CardTitle>
          <CardDescription className="text-[#616161]">
            Grafik loading faktor dan explained variance
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <PCAChart />
        </CardContent>
      </Card>

      {/* Interpretation */}
      <Card className="rounded-2xl border border-[#d9d9dd] bg-white">
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2 font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            <TrendingUp className="size-5 text-[#ff7759]" />
            Interpretasi Hasil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interpretations.map((item) => (
            <div
              key={item.component}
              className="overflow-hidden rounded-xl border border-[#f2f2f2] bg-[#f7f6f3]"
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: item.color }} />
              <div className="p-5">
                <h4
                  className="mb-2 font-normal tracking-tight text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  {item.component} - {item.variance}
                </h4>
                <p className="text-sm text-[#616161] leading-relaxed">{item.loadingDescription}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
