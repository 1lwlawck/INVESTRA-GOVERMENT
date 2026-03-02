import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InteractiveMap } from '@/components/organisms/charts/InteractiveMap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
} from 'recharts';
import { useIsMobile } from '@/hooks/ui/useMediaQuery';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from '@/core/api/analysis.api';
import { datasetApi, type DatasetData } from '@/core/api/dataset.api';
import { ApiError } from '@/core/api/http-client';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function VisualizationView() {
  useDocumentTitle('Visualisasi');
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 250 : 400;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noActiveDataset, setNoActiveDataset] = useState(false);
  const [clusterData, setClusterData] = useState<ClusterResult | null>(null);
  const [provinceData, setProvinceData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    setNoActiveDataset(false);

    try {
      const cData = await analysisApi.getClusters();
      setClusterData(cData);
    } catch (err) {
      setClusterData(null);
      if (err instanceof ApiError) {
        if (err.code === 'NO_ACTIVE_DATASET') {
          setNoActiveDataset(true);
          setError('Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
        } else if (err.code === 'ANALYSIS_NOT_FOUND') {
          setError('Belum ada hasil analisis. Jalankan analisis terlebih dahulu.');
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Gagal memuat hasil analisis.');
      }
    }

    try {
      const dsData: DatasetData = await datasetApi.getDefaultDatasetData(1, 100);
      setProvinceData(dsData.data);
    } catch (err) {
      setProvinceData([]);
      if (err instanceof ApiError && err.code === 'NO_ACTIVE_DATASET') {
        setNoActiveDataset(true);
        setError((prev) => prev ?? 'Belum ada dataset aktif. Upload CSV terlebih dahulu di halaman Dataset.');
      } else {
        setError((prev) => prev ?? (err instanceof Error ? err.message : 'Gagal memuat data provinsi.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const investmentByCluster = (clusterData?.summary || []).map((s: ClusterSummaryItem) => ({
    cluster: `Klaster ${s.cluster + 1} - ${s.label}`,
    value: +(((s.statistics?.pmdnRp?.mean ?? 0) + (s.statistics?.fdiRp?.mean ?? 0)) / 1e12).toFixed(2),
    color: CLUSTER_COLORS[s.cluster] || '#6B7280',
  }));

  const provincesDistribution = (clusterData?.summary || []).map((s: ClusterSummaryItem) => ({
    cluster: `Klaster ${s.cluster + 1}`,
    label: s.label,
    provinces: s.count,
    color: CLUSTER_COLORS[s.cluster] || '#6B7280',
  }));

  const scatterData = provinceData
    .filter((item) => {
      const p = item as Record<string, unknown>;
      const name = String(p.provinsi ?? '');
      return Boolean(name) && clusterData?.assignments?.[name] !== undefined;
    })
    .map((item) => {
      const p = item as Record<string, unknown>;
      const name = String(p.provinsi ?? '');
      return {
        pdrb: toNumber(p.pdrbPerKapita ?? p.pdrb_per_kapita),
        ipm: toNumber(p.ipm),
        cluster: clusterData?.assignments?.[name] ?? 0,
        name,
      };
    });

  const clusterIds = clusterData
    ? Array.from(new Set(Object.values(clusterData.assignments))).sort((a, b) => a - b)
    : [];

  if (loading) {
    return <BasicPageSkeleton cardCount={3} contentBlockCount={2} />;
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert className={noActiveDataset ? 'border-amber-500 bg-amber-50' : undefined}>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-lg border-l-4 border-[#F9B233] bg-white p-6 shadow-sm">
        <h2 className="text-[#002C5F]">Visualisasi Data Regional</h2>
        <p className="mt-2 text-gray-600">
          Representasi visual hasil analisis ketimpangan investasi antar provinsi (Rata-rata 2022-2024)
        </p>
      </div>

      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="border-b border-gray-200 bg-linear-to-r from-gray-50 to-blue-50">
          <CardTitle className="text-[#002C5F]">Peta Distribusi Klaster</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveMap />
        </CardContent>
      </Card>

      <Tabs defaultValue="investment" className="space-y-4">
        <TabsList className="flex w-full gap-1 overflow-x-auto bg-gray-100 p-1">
          <TabsTrigger
            value="investment"
            className="min-w-30 flex-1 text-xs data-[state=active]:bg-[#002C5F] data-[state=active]:text-white sm:text-sm"
          >
            Investasi
          </TabsTrigger>
          <TabsTrigger
            value="distribution"
            className="min-w-30 flex-1 text-xs data-[state=active]:bg-[#002C5F] data-[state=active]:text-white sm:text-sm"
          >
            Distribusi
          </TabsTrigger>
          <TabsTrigger
            value="scatter"
            className="min-w-25 flex-1 text-xs data-[state=active]:bg-[#002C5F] data-[state=active]:text-white sm:text-sm"
          >
            Scatter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="investment">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-[#002C5F]">Rata-rata Investasi per Klaster</CardTitle>
            </CardHeader>
            <CardContent>
              {investmentByCluster.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <BarChart data={investmentByCluster}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="cluster" stroke="#6B7280" tick={{ fontSize: 11 }} />
                    <YAxis
                      stroke="#6B7280"
                      label={{ value: 'Investasi Avg (Triliun Rp)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '2px solid #002C5F',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="value" name="Rata-rata Investasi" radius={[8, 8, 0, 0]}>
                      {investmentByCluster.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-gray-500">Data belum tersedia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-[#002C5F]">Distribusi Jumlah Provinsi per Klaster</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {provincesDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <PieChart>
                    <Pie
                      data={provincesDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cluster, provinces, percent }) =>
                        `${cluster}: ${provinces} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={120}
                      dataKey="provinces"
                    >
                      {provincesDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-gray-500">Data belum tersedia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scatter">
          <Card className="bg-white shadow-md">
            <CardHeader>
              <CardTitle className="text-[#002C5F]">Scatter Plot: PDRB per Kapita vs IPM</CardTitle>
            </CardHeader>
            <CardContent>
              {scatterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartHeight}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      type="number"
                      dataKey="pdrb"
                      name="PDRB per Kapita"
                      stroke="#6B7280"
                      label={{ value: 'PDRB per Kapita', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="ipm"
                      name="IPM"
                      stroke="#6B7280"
                      label={{ value: 'IPM', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    {clusterIds.map((clusterId) => (
                      <Scatter
                        key={clusterId}
                        name={CLUSTER_LABELS[clusterId] || `Klaster ${clusterId}`}
                        data={scatterData.filter((d) => d.cluster === clusterId)}
                        fill={CLUSTER_COLORS[clusterId] || '#6B7280'}
                      />
                    ))}
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-8 text-center text-gray-500">Data belum tersedia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
