import { useEffect, useMemo, useState } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Layer, PathOptions, LeafletMouseEvent, Path } from 'leaflet';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import 'leaflet/dist/leaflet.css';

import type { PublicClusterSummary } from '@/core/api/public.api';

/**
 * Public, auth-free choropleth map for the landing page.
 * Built from the same PublicClusterSummary[] that drives the cluster cards,
 * so it renders without an API token. Aliases mirror InteractiveMap so the
 * GeoJSON match rate is identical.
 */

/** Fits the map view to the GeoJSON extent once it loads, with light padding. */
function FitBounds({ geoData }: { geoData: FeatureCollection<Geometry> | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geoData) return;
    const bounds = L.geoJSON(geoData).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [16, 16] });
    }
  }, [geoData, map]);
  return null;
}

interface ProvinceGeoProperties {
  PROVINSI?: string;
  KODE_PROV?: string;
  id?: string;
}

const GEO_URL = '/geo/indonesia-provinces.json';
const NO_DATA_FILL = '#e5e7eb';
const INDONESIA_CENTER: [number, number] = [-2.5, 118];
const INITIAL_ZOOM = 5;
const MIN_ZOOM = 4;
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

function normalizeName(name: string): string {
  const trimmed = name.trim();
  return PROVINCE_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

interface ProvinceInfo {
  name: string;
  clusterLabel: string;
  color: string;
}

interface PublicChoroplethMapProps {
  clusters: PublicClusterSummary[];
}

export function PublicChoroplethMap({ clusters }: PublicChoroplethMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection<Geometry, ProvinceGeoProperties> | null>(
    null,
  );
  const [hovered, setHovered] = useState<ProvinceInfo | null>(null);

  // Fetch the GeoJSON once on mount.
  useEffect(() => {
    let active = true;
    fetch(GEO_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) setGeoData(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Flatten clusters → { lowercased name → ProvinceInfo }.
  const provinceByName = useMemo(() => {
    const map = new Map<string, ProvinceInfo>();
    for (const c of clusters) {
      for (const province of c.provinces) {
        const name = normalizeName(province);
        map.set(name.toLowerCase(), {
          name,
          clusterLabel: c.label,
          color: c.color,
        });
      }
    }
    return map;
  }, [clusters]);

  const geoStyle = (feature: Feature<Geometry, ProvinceGeoProperties> | undefined): PathOptions => {
    const provinceName = normalizeName(feature?.properties?.PROVINSI ?? '');
    const province = provinceByName.get(provinceName.toLowerCase());
    return {
      fillColor: province ? province.color : NO_DATA_FILL,
      fillOpacity: province ? 0.85 : 0.35,
      color: '#ffffff',
      weight: 1,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, ProvinceGeoProperties>, layer: Layer) => {
    const provinceName = normalizeName(feature.properties?.PROVINSI ?? '');
    const province = provinceByName.get(provinceName.toLowerCase());

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        if (province) setHovered(province);
        (e.target as Path).setStyle({ weight: 2, color: '#17171c', fillOpacity: 1 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        setHovered(null);
        (e.target as Path).setStyle(geoStyle(feature));
      },
    });
  };

  // Re-key GeoJSON when cluster mapping changes so styles refresh.
  const geoKey = useMemo(
    () =>
      Array.from(provinceByName.entries())
        .map(([k, v]) => `${k}:${v.color}`)
        .sort()
        .join('|'),
    [provinceByName],
  );

  return (
    <div
      className="relative w-full overflow-hidden rounded-[16px] border border-[#d9d9dd]"
      style={{ aspectRatio: '2 / 1', minHeight: 320 }}
    >
      <MapContainer
        center={INDONESIA_CENTER}
        zoom={INITIAL_ZOOM}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        zoomControl={false}
        attributionControl={false}
        scrollWheelZoom={false}
        className="absolute inset-0 size-full"
        style={{ background: '#f1f5ff' }}
      >
        <FitBounds geoData={geoData} />
        {geoData && (
          <GeoJSON key={geoKey} data={geoData} style={geoStyle} onEachFeature={onEachFeature} />
        )}
      </MapContainer>

      {hovered && (
        <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-[#d9d9dd] bg-white/95 p-3 text-sm shadow-md backdrop-blur">
          <p className="font-semibold text-[#17171c]">{hovered.name}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#616161]">
            <span className="size-2 rounded-full" style={{ backgroundColor: hovered.color }} />
            {hovered.clusterLabel}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 rounded-lg border border-[#d9d9dd] bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
        <p className="mb-1.5 font-medium text-[#93939f]">Legenda</p>
        <div className="space-y-1">
          {clusters.map((c) => (
            <div key={c.clusterId} className="flex items-center gap-2">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-[#212121]">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
