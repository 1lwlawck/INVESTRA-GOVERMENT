import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
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
      <div className="py-12 text-center text-[#93939f]">
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
      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
        <h3
          className="mb-4 font-normal tracking-tight text-[#17171c]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Varians yang Dijelaskan oleh Komponen Utama
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 200 : 300}>
          <BarChart data={varianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" />
            <XAxis
              dataKey="component"
              stroke="#93939f"
              tickLine={false}
              axisLine={{ stroke: '#d9d9dd' }}
            />
            <YAxis
              stroke="#93939f"
              tickLine={false}
              axisLine={{ stroke: '#d9d9dd' }}
              label={{
                value: 'Varians (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#93939f' },
              }}
            />
            <Tooltip
              cursor={{ fill: '#f7f6f3' }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #d9d9dd',
                borderRadius: '12px',
                boxShadow: 'none',
              }}
            />
            <Legend />
            <Bar dataKey="variance" fill="#003c33" name="Varians (%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Variance Line */}
      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
        <h3
          className="mb-4 font-normal tracking-tight text-[#17171c]"
          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
        >
          Kumulatif Varians
        </h3>
        <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
          <LineChart data={varianceData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f2f2f2" />
            <XAxis
              dataKey="component"
              stroke="#93939f"
              tickLine={false}
              axisLine={{ stroke: '#d9d9dd' }}
            />
            <YAxis
              stroke="#93939f"
              domain={[0, 100]}
              tickLine={false}
              axisLine={{ stroke: '#d9d9dd' }}
              label={{
                value: 'Kumulatif (%)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#93939f' },
              }}
            />
            <Tooltip
              cursor={{ stroke: '#d9d9dd', strokeWidth: 1 }}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #d9d9dd',
                borderRadius: '12px',
                boxShadow: 'none',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cumulative"
              stroke="#ff7759"
              strokeWidth={2.5}
              name="Kumulatif Varians (%)"
              dot={{ fill: '#ff7759', r: 5, strokeWidth: 0 }}
              activeDot={{ r: 7, fill: '#ff7759' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Factor Loadings */}
      <div className="rounded-2xl border border-[#d9d9dd] bg-white p-6">
        <div className="mb-5 border-b border-[#f2f2f2] pb-4">
          <h3
            className="font-normal tracking-tight text-[#17171c]"
            style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
          >
            Loading Faktor (PC1)
          </h3>
          <p className="mt-1 text-sm text-[#616161]">
            Kontribusi setiap variabel terhadap komponen utama pertama
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {factorLoadings.map((item) => (
            <div
              key={item.factor}
              className="flex items-center gap-3 rounded-xl border border-[#f2f2f2] bg-[#f7f6f3] p-4 transition-all hover:border-[#d9d9dd]"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-[#17171c]">{item.factor}</p>
                <p className="text-xs text-[#93939f]">
                  {item.rawLoading > 0 ? '+' : ''}
                  {item.rawLoading.toFixed(3)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-[#eeece7]">
                  <div
                    className="h-full rounded-full bg-[#003c33] transition-all"
                    style={{ width: `${item.loading * 100}%` }}
                  />
                </div>
                <span className="w-12 text-right text-sm font-medium text-[#17171c]">
                  {item.loading.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
