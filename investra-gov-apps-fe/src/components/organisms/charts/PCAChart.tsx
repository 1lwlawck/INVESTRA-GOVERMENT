import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useIsMobile } from '@/hooks/ui/useMediaQuery';
import { analysisApi, type PCAResult, FEATURE_LABELS } from '@/core/api/analysis.api';
import { BlockSkeleton } from '@/components/organisms/loading/PageSkeleton';

export function PCAChart() {
  const isMobile = useIsMobile();
  const [pcaData, setPcaData] = useState<PCAResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPCA();
  }, []);

  const loadPCA = async () => {
    setLoading(true);
    try {
      const data = await analysisApi.getPCA();
      setPcaData(data);
    } catch {
      setPcaData(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <BlockSkeleton heightClassName="h-64" />;
  }

  if (!pcaData) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Data PCA belum tersedia. Jalankan analisis terlebih dahulu.</p>
      </div>
    );
  }

  // Build explained variance chart data from real API
  const varianceData = pcaData.explainedVariance.map((ev) => ({
    component: `PC${ev.component}`,
    variance: +(ev.variance * 100).toFixed(1),
    cumulative: +(ev.cumulative * 100).toFixed(1),
  }));

  // Build factor loadings for PC1 from real API
  const pc1Loadings = pcaData.loadings['PC1'] || {};
  const factorLoadings = Object.entries(pc1Loadings)
    .map(([key, value]) => ({
      factor: FEATURE_LABELS[key] || key,
      loading: Math.abs(value),
      rawLoading: value,
    }))
    .sort((a, b) => b.loading - a.loading);

  return (
    <div className="space-y-8">
      {/* Explained Variance */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-[#002C5F] mb-4">
          Varians yang Dijelaskan oleh Komponen Utama
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <BarChart data={varianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="component" stroke="#6B7280" />
            <YAxis stroke="#6B7280" label={{ value: 'Varians (%)', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #002C5F',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Bar dataKey="variance" fill="#002C5F" name="Varians (%)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Variance Line */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-[#002C5F] mb-4">
          Kumulatif Varians
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
          <LineChart data={varianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="component" stroke="#6B7280" />
            <YAxis stroke="#6B7280" domain={[0, 100]} label={{ value: 'Kumulatif (%)', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '2px solid #002C5F',
                borderRadius: '8px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#F9B233"
              strokeWidth={3}
              name="Kumulatif Varians (%)"
              dot={{ fill: '#F9B233', r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Factor Loadings Table (PC1) */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="mb-4 pb-3 border-b border-gray-200">
          <h3 className="text-[#002C5F]">
            Loading Faktor (PC1)
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Kontribusi setiap variabel terhadap komponen utama pertama
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {factorLoadings.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-4 bg-linear-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="text-gray-800">{item.factor}</p>
                <p className="text-xs text-gray-500">{item.rawLoading > 0 ? '+' : ''}{item.rawLoading.toFixed(3)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-linear-to-r from-[#F9B233] to-[#002C5F] rounded-full transition-all"
                    style={{ width: `${item.loading * 100}%` }}
                  />
                </div>
                <span className="text-[#002C5F] w-12 text-right">{item.loading.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
