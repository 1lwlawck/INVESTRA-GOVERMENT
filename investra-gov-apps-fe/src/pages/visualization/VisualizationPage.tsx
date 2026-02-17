import { useState, useEffect } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InteractiveMap } from "@/components/organisms/charts/InteractiveMap";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { useIsMobile } from '@/hooks/ui/useMediaQuery';
import {
  analysisApi,
  type ClusterResult,
  type ClusterSummaryItem,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from '@/core/api/analysis.api';
import { datasetApi } from '@/core/api/dataset.api';
import { BasicPageSkeleton } from '@/components/organisms/loading/PageSkeleton';

export function VisualizationView() {
  useDocumentTitle('Visualisasi');
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 250 : 400;

  const [loading, setLoading] = useState(true);
  const [clusterData, setClusterData] = useState<ClusterResult | null>(null);
  const [provinceData, setProvinceData] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cData, dsData] = await Promise.all([
        analysisApi.getClusters().catch(() => null as ClusterResult | null),
        datasetApi.getDefaultDatasetData(1, 100).catch(() => null),
      ]);
      if (cData) setClusterData(cData);
      if (dsData) setProvinceData(dsData.data);
    } catch {
      // Fail silently
    } finally {
      setLoading(false);
    }
  };

  // Build investmentByCluster from real summary
  const investmentByCluster = (clusterData?.summary || []).map((s: ClusterSummaryItem) => ({
    cluster: `Klaster ${s.cluster + 1} - ${s.label}`,
    value: +(((s.statistics?.pmdnRp?.mean ?? 0) + (s.statistics?.fdiRp?.mean ?? 0)) / 1e12).toFixed(2),
    color: CLUSTER_COLORS[s.cluster] || '#6B7280',
  }));

  // Build province distribution from real summary
  const provincesDistribution = (clusterData?.summary || []).map((s: ClusterSummaryItem) => ({
    cluster: `Klaster ${s.cluster + 1}`,
    label: s.label,
    provinces: s.count,
    color: CLUSTER_COLORS[s.cluster] || '#6B7280',
  }));

  // Build scatter data from real province data + cluster assignments
  const scatterData = provinceData
    .filter((p) => {
      const name = String(p.provinsi || '');
      return clusterData?.assignments?.[name] !== undefined;
    })
    .map((p) => {
      const name = String(p.provinsi || '');
      return {
        pdrb: Number(p.pdrbPerKapita) || 0,
        ipm: Number(p.ipm) || 0,
        cluster: clusterData?.assignments?.[name] ?? 0,
        name,
      };
    });

  // Group scatter data per cluster for recharts
  const clusterIds = clusterData
    ? Array.from(new Set(Object.values(clusterData.assignments))).sort((a, b) => a - b)
    : [];

  if (loading) {
    return <BasicPageSkeleton cardCount={3} contentBlockCount={2} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-l-4 border-[#F9B233] pl-6 bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-[#002C5F]">
          Visualisasi Data Regional
        </h2>
        <p className="text-gray-600 mt-2">
          Representasi visual hasil analisis ketimpangan investasi antar provinsi (Rata-rata 2022–2024)
        </p>
      </div>

      {/* Interactive Map */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F]">Peta Distribusi Klaster</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <InteractiveMap />
        </CardContent>
      </Card>

      {/* Charts */}
      <Tabs defaultValue="investment" className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto bg-gray-100 p-1 gap-1">
          <TabsTrigger value="investment" className="flex-1 min-w-30 text-xs sm:text-sm data-[state=active]:bg-[#002C5F] data-[state=active]:text-white">
            Investasi
          </TabsTrigger>
          <TabsTrigger value="distribution" className="flex-1 min-w-30 text-xs sm:text-sm data-[state=active]:bg-[#002C5F] data-[state=active]:text-white">
            Distribusi
          </TabsTrigger>
          <TabsTrigger value="scatter" className="flex-1 min-w-25 text-xs sm:text-sm data-[state=active]:bg-[#002C5F] data-[state=active]:text-white">
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
                    <YAxis stroke="#6B7280" label={{ value: 'Investasi Avg (Triliun Rp)', angle: -90, position: 'insideLeft' }} />
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
                <p className="text-center py-8 text-gray-500">Data belum tersedia.</p>
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
                <p className="text-center py-8 text-gray-500">Data belum tersedia.</p>
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
                        data={scatterData.filter(d => d.cluster === clusterId)}
                        fill={CLUSTER_COLORS[clusterId] || '#6B7280'}
                      />
                    ))}
                    <Legend />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-8 text-gray-500">Data belum tersedia.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
