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
// react-leaflet v4 API verified against https://react-leaflet.js.org/docs/
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import type { Layer, PathOptions, LeafletMouseEvent, Path } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';

interface Province {
  name: string;
  cluster: number;
  pdrb: number;
  ipm: number;
  investasi: number;
}

/** Properties on each feature in the Indonesia provinces GeoJSON. */
interface ProvinceGeoProperties {
  PROVINSI?: string;
  KODE_PROV?: string;
  id?: string;
}

const GEO_URL = '/geo/indonesia-provinces.json';
const NO_DATA_FILL = '#d1d5db';
// Indonesia center (lat, lng) — Leaflet uses [lat, lng], the reverse of d3/simple-maps.
const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const INITIAL_ZOOM = 4.4;
const MIN_ZOOM = 3.5;
const MAX_ZOOM = 7;

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

/**
 * Bridges the external zoom buttons to the Leaflet map instance.
 * Rendered as a child of MapContainer so it can call useMap().
 * Pattern: https://react-leaflet.js.org/docs/api-map (useMap hook)
 */
function MapZoomSync({ onMapReady }: { onMapReady: (map: import('leaflet').Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

export const InteractiveMap = memo(() => {
  // mapRef holds the Leaflet Map instance via MapContainer ref={setMap} pattern
  // (verified: https://react-leaflet.js.org/docs/example-external-state)
  const [map, setMap] = useState<import('leaflet').Map | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<Province | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, ProvinceGeoProperties> | null>(
    null,
  );

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    setLoading(true);
    try {
      const [clusterData, dsData, geoJson] = await Promise.all([
        analysisApi.getClusters().catch(() => null as ClusterResult | null),
        datasetApi.getDefaultDatasetData(1, 100).catch(() => null),
        fetch(GEO_URL)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null) as Promise<FeatureCollection<Geometry, ProvinceGeoProperties> | null>,
      ]);

      if (geoJson) setGeoData(geoJson);

      if (clusterData) {
        // Build province → clusterId map using the most reliable source:
        // 1. panelStability.provinces — has dominantCluster per province (panel-aware)
        // 2. summary[].provinces — flat list per cluster (fallback)
        // Keyed by lowercased name for dedup; value keeps the original-cased name.
        const provinceClusterMap = new Map<string, { name: string; cluster: number }>();

        if (clusterData.panelStability?.provinces?.length) {
          for (const ps of clusterData.panelStability.provinces) {
            const name = normalizeProvinceName(ps.province);
            provinceClusterMap.set(name.toLowerCase(), { name, cluster: ps.dominantCluster });
          }
        } else if (clusterData.summary?.length) {
          for (const s of clusterData.summary) {
            for (const prov of s.provinces) {
              const name = normalizeProvinceName(prov);
              provinceClusterMap.set(name.toLowerCase(), { name, cluster: s.cluster });
            }
          }
        }

        const items = Array.from(provinceClusterMap.values()).map(({ name, cluster }) => {
          const pData = findDatasetRow(dsData?.data, name);
          const pmdn = Number(pData?.pmdnRp ?? pData?.pmdn_rp) || 0;
          const fdi = Number(pData?.fdiRp ?? pData?.fdi_rp) || 0;
          const pdrb = Number(pData?.pdrbPerKapita ?? pData?.pdrb_per_kapita) || 0;
          return {
            name,
            cluster,
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

  const handleZoomIn = useCallback(() => map?.zoomIn(), [map]);
  const handleZoomOut = useCallback(() => map?.zoomOut(), [map]);
  const handleResetZoom = useCallback(() => map?.setView(INDONESIA_CENTER, INITIAL_ZOOM), [map]);

  const handleProvinceHover = useCallback((province: Province | null) => {
    setHoveredProvince(province);
  }, []);

  // GeoJSON style: fill each province polygon with its cluster colour.
  // Memoised against `provinceByName` so Leaflet only re-renders when data changes.
  const geoStyle = useCallback(
    (feature: Feature<Geometry, ProvinceGeoProperties> | undefined): PathOptions => {
      const provinceName = normalizeProvinceName(feature?.properties?.PROVINSI ?? '');
      const province = provinceByName.get(provinceName.toLowerCase());
      const fill = province ? CLUSTER_COLORS[province.cluster] || '#6B7280' : NO_DATA_FILL;
      return {
        fillColor: fill,
        fillOpacity: province ? 0.85 : 0.4,
        color: '#ffffff',
        weight: 1,
      };
    },
    [provinceByName],
  );

  // Per-feature event binding — hover, focus, keyboard activation.
  const onEachFeature = useCallback(
    (feature: Feature<Geometry, ProvinceGeoProperties>, layer: Layer) => {
      const provinceName = normalizeProvinceName(feature.properties?.PROVINSI ?? '');
      const province = provinceByName.get(provinceName.toLowerCase());

      layer.on({
        mouseover: (e: LeafletMouseEvent) => {
          if (province) handleProvinceHover(province);
          // visual emphasis on hover — target is a vector Path with setStyle()
          (e.target as Path).setStyle({
            weight: 2,
            color: '#002C5F',
            fillOpacity: 1,
          });
        },
        mouseout: (e: LeafletMouseEvent) => {
          handleProvinceHover(null);
          // restore the base cluster style
          (e.target as Path).setStyle(geoStyle(feature));
        },
      });
    },
    [provinceByName, handleProvinceHover, geoStyle],
  );

  // Force GeoJSON to re-render when the cluster mapping changes (style fn captures it).
  const geoJsonKey = useMemo(
    () =>
      provinces
        .map((p) => `${p.name}:${p.cluster}`)
        .sort()
        .join('|'),
    [provinces],
  );

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
            disabled={!map}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={!map}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetZoom}
            disabled={!map}
            className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white"
            aria-label="Reset zoom"
          >
            <Maximize2 className="size-4" />
          </Button>
        </div>
      </div>

      <div
        className="relative w-full rounded-lg border-2 border-[#002C5F]/20 overflow-hidden shadow-lg"
        style={{ aspectRatio: '2 / 1', minHeight: 320 }}
      >
        <MapContainer
          ref={setMap}
          center={INDONESIA_CENTER}
          zoom={INITIAL_ZOOM}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          zoomControl={false}
          attributionControl={false}
          scrollWheelZoom={false}
          className="absolute inset-0 size-full"
          style={{ background: 'linear-gradient(to bottom right, #f0f9ff, #e0f2fe)' }}
        >
          <MapZoomSync onMapReady={setMap} />
          {geoData && (
            <GeoJSON
              key={geoJsonKey}
              data={geoData}
              style={geoStyle}
              onEachFeature={onEachFeature}
            />
          )}
        </MapContainer>

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
                    className="size-2.5 rounded-full"
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

        <div className="absolute bottom-2 right-2 rounded-xl border border-[#d9d9dd] bg-white/97 px-3 py-2.5 backdrop-blur-sm sm:bottom-4 sm:right-4 sm:px-4 sm:py-3">
          <p className="mb-2 border-b border-[#f2f2f2] pb-1.5 text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
            Legenda
          </p>
          <div className="space-y-1.5">
            {activeClusterIds.map((cid) => (
              <div key={cid} className="flex items-center gap-2">
                <div
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: CLUSTER_COLORS[cid] || '#6B7280' }}
                />
                <span className="text-xs text-[#212121] sm:text-sm">
                  {CLUSTER_LABELS[cid] ?? `Klaster ${cid}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clusterStats.map((stat) => (
          <div
            key={stat.cluster}
            className="overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white transition-all hover:border-[#93939f]"
          >
            <div className="h-1.5 w-full" style={{ backgroundColor: stat.color }} />
            <div className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                  {stat.label}
                </span>
                <span className="size-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
              </div>
              <p
                className="text-2xl font-normal tracking-tight text-[#17171c]"
                style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
              >
                {stat.count}
                <span className="ml-1 text-sm text-[#616161]">provinsi</span>
              </p>
              <p className="mt-1 text-xs text-[#93939f]">{stat.percentage}% dari total</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

InteractiveMap.displayName = 'InteractiveMap';
