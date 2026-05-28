import { Card } from '@/components/ui/card';
import { useState, useCallback, useMemo, memo, useEffect } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  analysisApi,
  type ClusterResult,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from '@/core/api/analysis.api';
import { datasetApi } from '@/core/api/dataset.api';
import { BlockSkeleton } from '@/components/organisms/loading/PageSkeleton';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';

interface Province {
  name: string;
  cluster: number;
  pdrb: number;
  ipm: number;
  investasi: number;
}

interface GeographyFeature {
  rsmKey: string;
  properties: {
    PROVINSI?: string;
    KODE_PROV?: string;
    id?: string;
  };
}

const GEO_URL = '/geo/indonesia-provinces.json';

const PROVINCE_ALIASES: Record<string, string> = {
  'daerah istimewa yogyakarta': 'DI Yogyakarta',
  yogyakarta: 'DI Yogyakarta',
  diy: 'DI Yogyakarta',
  'd.i. yogyakarta': 'DI Yogyakarta',
  'dki jakarta': 'DKI Jakarta',
  jakarta: 'DKI Jakarta',
  'jakarta raya': 'DKI Jakarta',
  'kepulauan bangka belitung': 'Kepulauan Bangka Belitung',
  'bangka belitung': 'Kepulauan Bangka Belitung',
  'bangka-belitung': 'Kepulauan Bangka Belitung',
  'kep. bangka belitung': 'Kepulauan Bangka Belitung',
  babel: 'Kepulauan Bangka Belitung',
  'kepulauan riau': 'Kepulauan Riau',
  'kep. riau': 'Kepulauan Riau',
  kepri: 'Kepulauan Riau',
  ntb: 'Nusa Tenggara Barat',
  ntt: 'Nusa Tenggara Timur',
  'sumatra utara': 'Sumatera Utara',
  'sumatra barat': 'Sumatera Barat',
  'sumatra selatan': 'Sumatera Selatan',
  'nanggroe aceh darussalam': 'Aceh',
  nad: 'Aceh',
};

function normalizeProvinceName(name: string): string {
  const trimmed = name.trim();
  const key = trimmed.toLowerCase();
  return PROVINCE_ALIASES[key] ?? trimmed;
}

function findDatasetRow(rows: Record<string, unknown>[] | undefined, provinceName: string) {
  const target = normalizeProvinceName(provinceName).toLowerCase();
  return rows?.find((row) => {
    const rawName = row.provinsi ?? row.province;
    return normalizeProvinceName(String(rawName ?? '')).toLowerCase() === target;
  });
}

export const InteractiveMap = memo(() => {
  const [zoom, setZoom] = useState(1);
  const [hoveredProvince, setHoveredProvince] = useState<Province | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const [clusterData, dsData] = await Promise.all([
        analysisApi.getClusters().catch(() => null as ClusterResult | null),
        datasetApi.getDefaultDatasetData(1, 100).catch(() => null),
      ]);

      if (clusterData) {
        const items = Object.entries(clusterData.assignments).map(([name, clusterId]) => {
          const pData = findDatasetRow(dsData?.data, name);
          const pmdn = Number(pData?.pmdnRp ?? pData?.pmdn_rp) || 0;
          const fdi = Number(pData?.fdiRp ?? pData?.fdi_rp) || 0;
          const pdrb = Number(pData?.pdrbPerKapita ?? pData?.pdrb_per_kapita) || 0;
          return {
            name: normalizeProvinceName(name),
            cluster: clusterId,
            pdrb,
            ipm: pData ? Number(pData.ipm) || 0 : 0,
            investasi: pData ? pmdn + fdi : 0,
          };
        });
        setProvinces(items);
      }
    } catch {
      setProvinces([]);
    } finally {
      setLoading(false);
    }
  };

  const provinceByName = useMemo(() => {
    return new Map(
      provinces.map((province) => [normalizeProvinceName(province.name).toLowerCase(), province]),
    );
  }, [provinces]);

  const activeClusterIds = useMemo(() => {
    const ids = new Set(provinces.map((p) => p.cluster));
    return Array.from(ids).sort((a, b) => a - b);
  }, [provinces]);

  const clusterStats = useMemo(
    () =>
      activeClusterIds.map((clusterId) => {
        const label = CLUSTER_LABELS[clusterId] || `Klaster ${clusterId}`;
        const count = provinces.filter((p) => p.cluster === clusterId).length;
        const percentage =
          provinces.length > 0 ? ((count / provinces.length) * 100).toFixed(1) : '0';
        return {
          cluster: clusterId,
          label,
          count,
          percentage,
          color: CLUSTER_COLORS[clusterId] || '#6B7280',
        };
      }),
    [provinces, activeClusterIds],
  );

  const handleZoomIn = useCallback(() => setZoom((p) => Math.min(3, p + 0.3)), []);
  const handleZoomOut = useCallback(() => setZoom((p) => Math.max(1, p - 0.3)), []);
  const handleResetZoom = useCallback(() => setZoom(1), []);

  const handleProvinceHover = useCallback((province: Province | null) => {
    setHoveredProvince(province);
  }, []);

  if (loading) {
    return <BlockSkeleton heightClassName="h-64" />;
  }

  if (provinces.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Data peta belum tersedia. Jalankan analisis terlebih dahulu.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-linear-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
        <div>
          <h3 className="text-[#002C5F] font-semibold">Peta Distribusi Klaster Indonesia</h3>
          <p className="text-sm text-gray-600 mt-1">
            {provinces.length} provinsi — {activeClusterIds.length} klaster
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 1}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-gray-500 min-w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 3}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="relative w-full bg-linear-to-br from-sky-50 via-blue-50 to-sky-100 rounded-lg border-2 border-[#002C5F]/20 overflow-hidden shadow-lg select-none"
        style={{ aspectRatio: '2 / 1', minHeight: 320 }}
      >
        <ComposableMap
          className="w-full h-full"
          width={1000}
          height={500}
          projection="geoMercator"
          projectionConfig={{ center: [118, -2.5], scale: 1450 }}
          role="img"
          aria-label="Peta distribusi klaster investasi Indonesia"
        >
          <ZoomableGroup zoom={zoom} center={[118, -2.5]} minZoom={1} maxZoom={3}>
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: GeographyFeature[] }) =>
                geographies.map((geo) => {
                  const provinceName = normalizeProvinceName(geo.properties.PROVINSI ?? '');
                  const province = provinceByName.get(provinceName.toLowerCase());
                  const fill = province ? CLUSTER_COLORS[province.cluster] || '#6B7280' : '#d1d5db';

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={fill}
                      stroke="#ffffff"
                      strokeWidth={0.45}
                      onMouseEnter={() => province && handleProvinceHover(province)}
                      onMouseLeave={() => handleProvinceHover(null)}
                      tabIndex={province ? 0 : -1}
                      role={province ? 'button' : 'img'}
                      aria-label={
                        province
                          ? `${province.name}, ${CLUSTER_LABELS[province.cluster] ?? ''}`
                          : provinceName
                      }
                      onKeyDown={(e) => {
                        if (province && (e.key === 'Enter' || e.key === ' '))
                          handleProvinceHover(province);
                      }}
                      style={{
                        default: { outline: 'none', opacity: province ? 0.9 : 0.45 },
                        hover: {
                          outline: 'none',
                          opacity: 1,
                          stroke: '#002C5F',
                          strokeWidth: 0.75,
                        },
                        pressed: { outline: 'none', opacity: 1 },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>

        {hoveredProvince && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/97 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-2xl border-2 border-[#F9B233] max-w-65 sm:max-w-xs z-10 animate-in fade-in duration-200">
            <h4 className="text-[#002C5F] font-semibold mb-3 pb-2 border-b border-gray-200 text-sm sm:text-base">
              {hoveredProvince.name}
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Klaster:</span>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: CLUSTER_COLORS[hoveredProvince.cluster] || '#6B7280',
                    }}
                  />
                  <span className="font-medium text-gray-800">
                    {CLUSTER_LABELS[hoveredProvince.cluster] ?? ''}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">PDRB/Kapita:</span>
                <span className="font-medium text-gray-800">
                  Rp {hoveredProvince.pdrb.toLocaleString('id-ID', { maximumFractionDigits: 1 })}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">IPM:</span>
                <span className="font-medium text-gray-800">{hoveredProvince.ipm.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Investasi:</span>
                <span className="font-medium text-gray-800">
                  Rp{' '}
                  {(hoveredProvince.investasi / 1e12).toLocaleString('id-ID', {
                    maximumFractionDigits: 2,
                  })}{' '}
                  T
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white/97 backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-xl border border-gray-200">
          <p className="text-[#002C5F] font-semibold text-xs sm:text-sm mb-2 pb-1.5 border-b border-gray-200">
            Legenda Klaster
          </p>
          <div className="space-y-1.5">
            {activeClusterIds.map((cid) => (
              <div key={cid} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full shadow-sm"
                  style={{ backgroundColor: CLUSTER_COLORS[cid] || '#6B7280' }}
                />
                <span className="text-gray-700 text-xs sm:text-sm">
                  {CLUSTER_LABELS[cid] ?? `Klaster ${cid}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusterStats.map((stat) => (
          <Card
            key={stat.cluster}
            className="p-5 text-center border-2 hover:shadow-lg transition-all bg-white"
            style={{ borderColor: stat.color }}
          >
            <div
              className="w-4 h-4 rounded-full mx-auto mb-3 shadow-sm"
              style={{ backgroundColor: stat.color }}
            />
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-[#002C5F] text-xl font-bold mb-1">{stat.count} provinsi</p>
            <p className="text-gray-500 text-sm">{stat.percentage}%</p>
          </Card>
        ))}
      </div>
    </div>
  );
});

InteractiveMap.displayName = 'InteractiveMap';
