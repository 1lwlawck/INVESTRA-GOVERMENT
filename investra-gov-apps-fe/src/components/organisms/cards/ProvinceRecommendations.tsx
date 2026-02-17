import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Search } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import {
  type PolicyResult,
  CLUSTER_COLORS,
  FEATURE_LABELS,
} from "@/core/api/analysis.api";

const CONDITION_BADGE_COLORS: Record<string, string> = {
  "Sangat Tinggi": "#059669",
  Tinggi: "#3B82F6",
  "Rata-rata": "#6B7280",
  Rendah: "#F59E0B",
  "Sangat Rendah": "#DC2626",
  "Sangat Baik": "#059669",
  Baik: "#3B82F6",
  "Sangat Buruk": "#DC2626",
  Buruk: "#F59E0B",
};

interface Props {
  policy: PolicyResult;
}

/**
 * Dynamic province-level recommendations.
 * Shows each province with its cluster profile,
 * characteristics, and applicable policy directions.
 */
export function ProvinceRecommendations({ policy }: Props) {
  const [search, setSearch] = useState("");
  const [filterCluster, setFilterCluster] = useState<number | null>(null);

  // Build flat province list from cluster_policies
  const provinceList = useMemo(() => {
    const items: {
      name: string;
      clusterId: number;
      clusterLabel: string;
      color: string;
    }[] = [];

    for (const cp of policy.clusterPolicies) {
      for (const prov of cp.provinces) {
        items.push({
          name: prov,
          clusterId: cp.clusterId,
          clusterLabel: cp.label,
          color: CLUSTER_COLORS[cp.clusterId] || "#6B7280",
        });
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return items;
  }, [policy]);

  // Apply filters
  const filteredProvinces = useMemo(() => {
    let list = provinceList;
    if (filterCluster !== null) {
      list = list.filter((p) => p.clusterId === filterCluster);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [provinceList, search, filterCluster]);

  const getClusterPolicy = (clusterId: number) =>
    policy.clusterPolicies.find((cp) => cp.clusterId === clusterId);

  return (
    <div className="space-y-6">
      {/* Search & filter */}
      <Card className="border border-gray-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari provinsi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterCluster(null)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filterCluster === null
                    ? "bg-[#002C5F] text-white border-[#002C5F]"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                Semua ({provinceList.length})
              </button>
              {policy.clusterPolicies.map((cp) => (
                <button
                  key={cp.clusterId}
                  onClick={() =>
                    setFilterCluster(
                      filterCluster === cp.clusterId ? null : cp.clusterId,
                    )
                  }
                  className="text-xs px-3 py-1.5 rounded-full border transition-all"
                  style={{
                    backgroundColor:
                      filterCluster === cp.clusterId
                        ? (CLUSTER_COLORS[cp.clusterId] || "#6B7280")
                        : "white",
                    color:
                      filterCluster === cp.clusterId
                        ? "white"
                        : (CLUSTER_COLORS[cp.clusterId] || "#6B7280"),
                    borderColor: CLUSTER_COLORS[cp.clusterId] || "#6B7280",
                  }}
                >
                  {cp.label.replace("Investasi ", "")} ({cp.count})
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Province accordion list */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F] text-lg">
            Detail Per Provinsi
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({filteredProvinces.length} dari {provinceList.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredProvinces.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {filteredProvinces.map((prov) => {
                const cp = getClusterPolicy(prov.clusterId);
                if (!cp) return null;

                return (
                  <AccordionItem
                    key={prov.name}
                    value={prov.name}
                    className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-all"
                    style={{ borderColor: prov.color }}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3 text-left w-full">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: prov.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[#002C5F] font-semibold text-sm">
                            {prov.name}
                          </h4>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {prov.clusterLabel} — {cp.dominantFactor}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-5 mt-2">
                        {/* Cluster assignment badge */}
                        <div
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm"
                          style={{
                            borderColor: prov.color,
                            backgroundColor: `${prov.color}08`,
                          }}
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: prov.color }}
                          />
                          <span className="text-gray-700">
                            Termasuk dalam{" "}
                            <strong style={{ color: prov.color }}>
                              {prov.clusterLabel}
                            </strong>{" "}
                            bersama {cp.count - 1} provinsi lainnya
                          </span>
                        </div>

                        {/* Cluster characteristics */}
                        <div>
                          <p className="text-xs font-semibold text-[#002C5F] mb-2">
                            Profil Klaster (vs Rata-rata Nasional)
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                            {Object.entries(cp.characteristics).map(
                              ([key, ch]) => (
                                <div
                                  key={key}
                                  className="bg-gray-50 rounded-lg p-2 border border-gray-100 text-center"
                                >
                                  <p className="text-[9px] text-gray-500 mb-1 leading-tight">
                                    {FEATURE_LABELS[key] || ch.label}
                                  </p>
                                  <span
                                    className="inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                                    style={{
                                      backgroundColor:
                                        CONDITION_BADGE_COLORS[ch.condition] ||
                                        "#6B7280",
                                    }}
                                  >
                                    {ch.condition}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        </div>

                        {/* Statistical rationale */}
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                            Analisis Statistik
                          </p>
                          <p className="text-xs text-blue-900 leading-relaxed">
                            {cp.policyRationale}
                          </p>
                        </div>

                        {/* Policy directions */}
                        <div>
                          <p className="text-xs font-semibold text-[#002C5F] mb-3">
                            Arah Kebijakan yang Berlaku
                          </p>
                          <div className="space-y-3">
                            {cp.policyDirections.map((pd, idx) => (
                              <div
                                key={idx}
                                className="bg-linear-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200"
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <div
                                    className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold shrink-0"
                                    style={{ backgroundColor: prov.color }}
                                  >
                                    {idx + 1}
                                  </div>
                                  <div className="flex-1">
                                    <h5 className="text-[#002C5F] font-semibold text-sm">
                                      {pd.direction}
                                    </h5>
                                    <p className="text-xs text-gray-600 leading-relaxed mt-1 mb-2">
                                      {pd.rationale}
                                    </p>
                                    <ul className="space-y-1">
                                      {pd.actions.map((action, ai) => (
                                        <li
                                          key={ai}
                                          className="flex items-start gap-1.5 text-xs text-gray-700"
                                        >
                                          <span
                                            className="inline-block w-1 h-1 rounded-full mt-1.5 shrink-0"
                                            style={{
                                              backgroundColor: prov.color,
                                            }}
                                          />
                                          <span>{action}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Other provinces in same cluster */}
                        <div>
                          <p className="text-xs font-semibold text-[#002C5F] mb-2">
                            Provinsi Lain di Klaster yang Sama
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {cp.provinces
                              .filter((p) => p !== prov.name)
                              .map((other) => (
                                <span
                                  key={other}
                                  className="text-[10px] px-2 py-0.5 rounded-full border shrink-0"
                                  style={{
                                    borderColor: prov.color,
                                    color: prov.color,
                                    backgroundColor: `${prov.color}10`,
                                  }}
                                >
                                  {other}
                                </span>
                              ))}
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Tidak ada provinsi yang ditemukan</p>
              <p className="text-sm text-gray-400 mt-1">
                Coba kata kunci pencarian yang berbeda
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
