import { Card } from "@/components/ui/card";
import { useState, useCallback, useMemo, memo, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  analysisApi,
  type ClusterResult,
  CLUSTER_COLORS,
  CLUSTER_LABELS,
} from "@/core/api/analysis.api";
import { datasetApi } from "@/core/api/dataset.api";
import { BlockSkeleton } from "@/components/organisms/loading/PageSkeleton";

interface Province {
  name: string;
  cluster: number;
  x: number;
  y: number;
  pdrb: number;
  ipm: number;
  investasi: number;
}

/* ------------------------------------------------------------------ */
/*  Province positions on a 200×100 SVG viewBox                       */
/*  Derived from approximate capital city lat/lon:                     */
/*    x = (lon − 94) × 3.6 + 5                                       */
/*    y = (lat_south + 6) × 5 + 5  (north = negative lat_south)      */
/* ------------------------------------------------------------------ */
const PROVINCE_POSITIONS: Record<string, { x: number; y: number }> = {
  // --- Sumatra ---
  Aceh:                          { x: 10,  y: 8  },
  "Sumatera Utara":              { x: 22,  y: 17 },
  "Sumatera Barat":              { x: 28,  y: 40 },
  Riau:                          { x: 32,  y: 33 },
  "Kepulauan Riau":              { x: 42,  y: 30 },
  Jambi:                         { x: 39,  y: 43 },
  "Sumatera Selatan":            { x: 43,  y: 51 },
  Bengkulu:                      { x: 35,  y: 54 },
  Lampung:                       { x: 46,  y: 62 },
  "Kepulauan Bangka Belitung":   { x: 48,  y: 46 },
  // --- Java ---
  Banten:                        { x: 49,  y: 66 },
  "DKI Jakarta":                 { x: 51,  y: 67 },
  "Jawa Barat":                  { x: 54,  y: 70 },
  "Jawa Tengah":                 { x: 64,  y: 71 },
  "DI Yogyakarta":               { x: 64,  y: 74 },
  "Jawa Timur":                  { x: 73,  y: 72 },
  // --- Bali & Nusa Tenggara ---
  Bali:                          { x: 81,  y: 78 },
  "Nusa Tenggara Barat":         { x: 85,  y: 78 },
  "Nusa Tenggara Timur":         { x: 109, y: 84 },
  // --- Kalimantan ---
  "Kalimantan Barat":            { x: 60,  y: 35 },
  "Kalimantan Tengah":           { x: 76,  y: 46 },
  "Kalimantan Selatan":          { x: 79,  y: 52 },
  "Kalimantan Timur":            { x: 88,  y: 38 },
  "Kalimantan Utara":            { x: 89,  y: 21 },
  // --- Sulawesi ---
  "Sulawesi Utara":              { x: 116, y: 28 },
  Gorontalo:                     { x: 110, y: 33 },
  "Sulawesi Tengah":             { x: 98,  y: 40 },
  "Sulawesi Barat":              { x: 92,  y: 49 },
  "Sulawesi Selatan":            { x: 96,  y: 61 },
  "Sulawesi Tenggara":           { x: 107, y: 55 },
  // --- Maluku ---
  "Maluku Utara":                { x: 125, y: 33 },
  Maluku:                        { x: 128, y: 54 },
  // --- Papua ---
  "Papua Barat Daya":            { x: 139, y: 40 },
  "Papua Barat":                 { x: 149, y: 40 },
  "Papua Tengah":                { x: 154, y: 52 },
  "Papua Pegunungan":            { x: 166, y: 56 },
  Papua:                         { x: 173, y: 48 },
  "Papua Selatan":               { x: 172, y: 77 },
};

/* ------------------------------------------------------------------ */
/*  Province name aliases → canonical name in PROVINCE_POSITIONS.     */
/*  Handles common CSV naming variations so the map doesn't break.    */
/* ------------------------------------------------------------------ */
const PROVINCE_NAME_ALIASES: Record<string, string> = {
  // Kepulauan shorthand
  "Bangka Belitung":                       "Kepulauan Bangka Belitung",
  "Kep. Bangka Belitung":                  "Kepulauan Bangka Belitung",
  "Kep Bangka Belitung":                   "Kepulauan Bangka Belitung",
  "Babel":                                 "Kepulauan Bangka Belitung",
  "Kep. Riau":                             "Kepulauan Riau",
  "Kep Riau":                              "Kepulauan Riau",
  "Kepri":                                 "Kepulauan Riau",
  // DKI / DI
  "Jakarta":                               "DKI Jakarta",
  "Dki Jakarta":                           "DKI Jakarta",
  "D.K.I. Jakarta":                        "DKI Jakarta",
  "Prov. DKI Jakarta":                     "DKI Jakarta",
  "Yogyakarta":                            "DI Yogyakarta",
  "D.I. Yogyakarta":                       "DI Yogyakarta",
  "DIY":                                   "DI Yogyakarta",
  "Daerah Istimewa Yogyakarta":            "DI Yogyakarta",
  // Nusa Tenggara
  "NTB":                                   "Nusa Tenggara Barat",
  "NTT":                                   "Nusa Tenggara Timur",
  // Papua DOB
  "Papua Barat Daya":                      "Papua Barat Daya",
  "Papua Barattdaya":                      "Papua Barat Daya",
  // Sumatra spelling variants
  "Sumatera Utara":                        "Sumatera Utara",
  "Sumatra Utara":                         "Sumatera Utara",
  "Sumatra Barat":                         "Sumatera Barat",
  "Sumatra Selatan":                       "Sumatera Selatan",
  // NAD
  "Nanggroe Aceh Darussalam":              "Aceh",
  "NAD":                                   "Aceh",
  "Prov. Aceh":                            "Aceh",
};

/**
 * Resolve a province name to its position, handling aliases and fuzzy matching.
 */
function resolveProvincePosition(name: string): { x: number; y: number } | null {
  // 1. Exact match
  if (PROVINCE_POSITIONS[name]) return PROVINCE_POSITIONS[name];

  // 2. Alias lookup
  const aliased = PROVINCE_NAME_ALIASES[name];
  if (aliased && PROVINCE_POSITIONS[aliased]) return PROVINCE_POSITIONS[aliased];

  // 3. Case-insensitive + trim
  const nameLower = name.trim().toLowerCase();
  for (const key of Object.keys(PROVINCE_POSITIONS)) {
    if (key.toLowerCase() === nameLower) return PROVINCE_POSITIONS[key];
  }

  // 4. Case-insensitive alias
  for (const [alias, canonical] of Object.entries(PROVINCE_NAME_ALIASES)) {
    if (alias.toLowerCase() === nameLower && PROVINCE_POSITIONS[canonical]) {
      return PROVINCE_POSITIONS[canonical];
    }
  }

  // 5. Substring / contains match (longest match wins)
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const key of Object.keys(PROVINCE_POSITIONS)) {
    const keyLower = key.toLowerCase();
    if (
      (nameLower.includes(keyLower) || keyLower.includes(nameLower)) &&
      keyLower.length > bestLen
    ) {
      bestMatch = key;
      bestLen = keyLower.length;
    }
  }
  if (bestMatch) return PROVINCE_POSITIONS[bestMatch];

  return null;
}

/* ------------------------------------------------------------------ */
/*  Simplified SVG island outlines (200×100 viewBox)                  */
/* ------------------------------------------------------------------ */
const ISLAND_PATHS = [
  // Sumatra
  "M 8,5 L 14,4 L 18,9 L 23,16 L 28,24 L 33,33 L 38,41 L 43,49 L 47,57 L 49,64 L 48,68 L 44,72 L 40,66 L 35,58 L 30,49 L 25,40 L 20,30 L 15,20 L 10,12 Z",
  // Java
  "M 47,68 L 51,65 L 57,66 L 63,68 L 69,70 L 75,72 L 80,75 L 76,78 L 70,76 L 64,74 L 58,72 L 52,70 L 48,70 Z",
  // Bali
  "M 80,75 L 83,74 L 84,77 L 81,78 Z",
  // Lombok
  "M 85,75 L 88,74 L 88,78 L 85,78 Z",
  // Sumbawa
  "M 90,76 L 96,74 L 97,77 L 91,79 Z",
  // Flores
  "M 99,80 L 106,78 L 108,80 L 101,83 Z",
  // Timor
  "M 109,80 L 115,78 L 116,82 L 110,84 Z",
  // Kalimantan
  "M 56,28 L 64,22 L 74,20 L 82,22 L 90,28 L 94,36 L 92,44 L 88,52 L 82,56 L 76,54 L 70,50 L 64,44 L 59,37 Z",
  // Sulawesi (main body)
  "M 95,36 L 99,30 L 105,26 L 112,25 L 118,28 L 115,32 L 109,34 L 104,38 L 100,44 L 97,50 L 94,56 L 96,62 L 100,66 L 96,68 L 92,62 L 90,54 L 92,46 L 94,40 Z",
  // Sulawesi SE arm
  "M 100,44 L 106,48 L 112,54 L 110,58 L 104,52 L 98,46 Z",
  // Halmahera (Maluku Utara)
  "M 122,26 L 126,24 L 130,28 L 128,34 L 126,38 L 123,34 L 122,30 Z",
  // Seram (Maluku)
  "M 124,50 L 132,48 L 136,52 L 130,56 L 125,54 Z",
  // Papua (Bird's Head + mainland)
  "M 136,32 L 140,28 L 146,30 L 152,32 L 148,38 L 142,40 L 138,36 Z",
  // Papua mainland
  "M 148,38 L 155,34 L 162,38 L 168,42 L 174,44 L 178,50 L 176,58 L 178,66 L 176,74 L 174,80 L 170,78 L 166,70 L 162,62 L 156,56 L 150,50 L 146,44 Z",
];

/* ------------------------------------------------------------------ */
/*  Island labels                                                     */
/* ------------------------------------------------------------------ */
const ISLAND_LABELS = [
  { text: "SUMATRA",     x: 24, y: 35, rotate: -55 },
  { text: "JAWA",        x: 62, y: 76, rotate: 0 },
  { text: "KALIMANTAN",  x: 74, y: 38, rotate: 0 },
  { text: "SULAWESI",    x: 100, y: 48, rotate: -30 },
  { text: "PAPUA",       x: 162, y: 58, rotate: 0 },
];

const DOT_RADIUS = 2.8;

export const InteractiveMap = memo(() => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
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
        const items: Province[] = [];
        for (const [name, clusterId] of Object.entries(clusterData.assignments)) {
          const pos = resolveProvincePosition(name);
          if (!pos) continue; // skip unknown provinces instead of stacking
          const pData = dsData?.data?.find((p: Record<string, unknown>) => {
            const provinceName = p.provinsi ?? p.province;
            return String(provinceName ?? "") === name;
          });
          const pmdn = Number(pData?.pmdnRp ?? pData?.pmdn_rp) || 0;
          const fdi = Number(pData?.fdiRp ?? pData?.fdi_rp) || 0;
          const pdrb = Number(pData?.pdrbPerKapita ?? pData?.pdrb_per_kapita) || 0;
          const investasi = pData
            ? pmdn + fdi
            : 0;
          items.push({
            name,
            cluster: clusterId,
            x: pos.x,
            y: pos.y,
            pdrb,
            ipm: pData ? Number(pData.ipm) || 0 : 0,
            investasi,
          });
        }
        setProvinces(items);
      }
    } catch {
      /* empty – map shows empty state */
    } finally {
      setLoading(false);
    }
  };

  /* --- zoom & pan ------------------------------------------------- */
  const handleZoomIn = useCallback(() => setZoom((p) => Math.min(3, p + 0.3)), []);
  const handleZoomOut = useCallback(() => {
    setZoom((p) => {
      const next = Math.max(1, p - 0.3);
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom <= 1) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [zoom, pan],
  );
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [isPanning, panStart],
  );
  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleProvinceHover = useCallback((province: Province | null) => {
    setHoveredProvince(province);
  }, []);

  /* --- derived ---------------------------------------------------- */
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
          provinces.length > 0
            ? ((count / provinces.length) * 100).toFixed(1)
            : "0";
        return {
          cluster: clusterId,
          label,
          count,
          percentage,
          color: CLUSTER_COLORS[clusterId] || "#6B7280",
        };
      }),
    [provinces, activeClusterIds],
  );

  /* --- loading / empty -------------------------------------------- */
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

  /* --- render ----------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-linear-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
        <div>
          <h3 className="text-[#002C5F] font-semibold">Peta Distribusi Klaster Indonesia</h3>
          <p className="text-sm text-gray-600 mt-1">
            {provinces.length} provinsi — {activeClusterIds.length} klaster
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 1} className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
          <span className="text-xs text-gray-500 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 3} className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={handleResetZoom} className="border-[#002C5F] text-[#002C5F] hover:bg-[#002C5F] hover:text-white" aria-label="Reset zoom"><Maximize2 className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Map */}
      <div
        className="relative w-full bg-linear-to-br from-sky-50 via-blue-50 to-sky-100 rounded-lg border-2 border-[#002C5F]/20 overflow-hidden shadow-lg select-none"
        style={{ aspectRatio: "2 / 1", minHeight: 320 }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 200 100"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transition: isPanning ? "none" : "transform 0.3s ease",
            cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
          }}
          role="img"
          aria-label="Peta distribusi klaster investasi Indonesia"
        >
          {/* Ocean grid lines */}
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#93c5fd" strokeWidth="0.15" opacity="0.4" />
            </pattern>
          </defs>
          <rect width="200" height="100" fill="url(#grid)" />

          {/* Island silhouettes */}
          {ISLAND_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="#d1d5db"
              stroke="#9ca3af"
              strokeWidth="0.4"
              opacity="0.45"
            />
          ))}

          {/* Island labels */}
          {ISLAND_LABELS.map((lbl, i) => (
            <text
              key={i}
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              fill="#6b7280"
              fontSize="3.2"
              fontWeight="600"
              opacity="0.35"
              letterSpacing="0.8"
              transform={lbl.rotate ? `rotate(${lbl.rotate} ${lbl.x} ${lbl.y})` : undefined}
            >
              {lbl.text}
            </text>
          ))}

          {/* Province dots — outer glow ring + solid dot */}
          {provinces.map((prov, idx) => (
            <g key={idx}>
              {/* glow ring */}
              <circle
                cx={prov.x}
                cy={prov.y}
                r={DOT_RADIUS + 1.2}
                fill={CLUSTER_COLORS[prov.cluster] || "#6B7280"}
                opacity="0.2"
              />
              {/* solid dot */}
              <circle
                cx={prov.x}
                cy={prov.y}
                r={DOT_RADIUS}
                fill={CLUSTER_COLORS[prov.cluster] || "#6B7280"}
                stroke="#fff"
                strokeWidth="0.5"
                opacity="0.92"
                className="cursor-pointer transition-all"
                onMouseEnter={() => handleProvinceHover(prov)}
                onMouseLeave={() => handleProvinceHover(null)}
                role="button"
                tabIndex={0}
                aria-label={`${prov.name}, ${CLUSTER_LABELS[prov.cluster] ?? ""}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleProvinceHover(prov);
                }}
              >
                <title>{`${prov.name} — ${CLUSTER_LABELS[prov.cluster] ?? ""}`}</title>
              </circle>
            </g>
          ))}
        </svg>

        {/* Hover tooltip */}
        {hoveredProvince && (
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 bg-white/97 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-2xl border-2 border-[#F9B233] max-w-65 sm:max-w-xs z-10 animate-in fade-in duration-200">
            <h4 className="text-[#002C5F] font-semibold mb-3 pb-2 border-b border-gray-200 text-sm sm:text-base">
              {hoveredProvince.name}
            </h4>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Klaster:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[hoveredProvince.cluster] || "#6B7280" }} />
                  <span className="font-medium text-gray-800">{CLUSTER_LABELS[hoveredProvince.cluster] ?? ""}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">PDRB/Kapita:</span>
                <span className="font-medium text-gray-800">Rp {hoveredProvince.pdrb.toLocaleString("id-ID", { maximumFractionDigits: 1 })}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">IPM:</span>
                <span className="font-medium text-gray-800">{hoveredProvince.ipm.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500">Investasi:</span>
                <span className="font-medium text-gray-800">Rp {(hoveredProvince.investasi / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 2 })} T</span>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 bg-white/97 backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl shadow-xl border border-gray-200">
          <p className="text-[#002C5F] font-semibold text-xs sm:text-sm mb-2 pb-1.5 border-b border-gray-200">Legenda Klaster</p>
          <div className="space-y-1.5">
            {activeClusterIds.map((cid) => (
              <div key={cid} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: CLUSTER_COLORS[cid] || "#6B7280" }} />
                <span className="text-gray-700 text-xs sm:text-sm">{CLUSTER_LABELS[cid] ?? `Klaster ${cid}`}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cluster stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {clusterStats.map((stat) => (
          <Card key={stat.cluster} className="p-5 text-center border-2 hover:shadow-lg transition-all bg-white" style={{ borderColor: stat.color }}>
            <div className="w-4 h-4 rounded-full mx-auto mb-3 shadow-sm" style={{ backgroundColor: stat.color }} />
            <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
            <p className="text-[#002C5F] text-xl font-bold mb-1">{stat.count} provinsi</p>
            <p className="text-gray-500 text-sm">{stat.percentage}%</p>
          </Card>
        ))}
      </div>
    </div>
  );
});

InteractiveMap.displayName = "InteractiveMap";
