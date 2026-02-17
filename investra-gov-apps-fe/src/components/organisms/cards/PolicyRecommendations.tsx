import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  type PolicyResult,
  type ClusterPolicy,
  CLUSTER_COLORS,
  FEATURE_LABELS,
} from "@/core/api/analysis.api";

const CONDITION_COLORS: Record<string, string> = {
  "Sangat Tinggi": "#059669",
  "Tinggi": "#3B82F6",
  "Rata-rata": "#6B7280",
  "Rendah": "#F59E0B",
  "Sangat Rendah": "#DC2626",
  "Sangat Baik": "#059669",
  "Baik": "#3B82F6",
  "Sangat Buruk": "#DC2626",
  "Buruk": "#F59E0B",
};

interface Props {
  policy: PolicyResult;
}

export function PolicyRecommendations({ policy }: Props) {
  return (
    <div className="space-y-6">
      {/* National Average Reference */}
      <Card className="border border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#002C5F] text-sm">Rata-rata Nasional (Baseline)</CardTitle>
          <CardDescription className="text-xs">Nilai acuan untuk menentukan posisi relatif setiap klaster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {Object.entries(policy.nationalAverage).map(([key, val]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                <p className="text-[10px] text-gray-500 mb-1 leading-tight">{val.label}</p>
                <p className="text-sm font-bold text-[#002C5F]">
                  {key === "pmdnRp" || key === "fdiRp"
                    ? `${(val.value / 1e12).toFixed(1)} T`
                    : key === "pdrbPerKapita"
                      ? val.value.toLocaleString("id-ID")
                      : val.value.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cluster Policy Accordion */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F] text-xl">Arah Kebijakan Per Klaster</CardTitle>
          <CardDescription className="text-gray-600">
            Rekomendasi dihasilkan secara otomatis dari profil statistik setiap klaster (rule-based)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="space-y-4">
            {policy.clusterPolicies.map((cp) => (
              <ClusterAccordionItem key={cp.clusterId} cp={cp} />
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

function ClusterAccordionItem({ cp }: { cp: ClusterPolicy }) {
  const color = CLUSTER_COLORS[cp.clusterId] || "#6B7280";

  return (
    <AccordionItem
      value={`cluster-${cp.clusterId}`}
      className="border-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-all"
      style={{ borderColor: color }}
    >
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex items-center gap-4 text-left w-full">
          <div className="p-3 rounded-lg shrink-0" style={{ backgroundColor: `${color}20` }}>
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: color }} />
          </div>
          <div className="flex-1">
            <h3 className="text-[#002C5F] font-semibold">{cp.label}</h3>
            <p className="text-sm text-gray-600 mt-1">{cp.count} provinsi — {cp.dominantFactor}</p>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-6 mt-4">
          {/* Rationale */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">Analisis Statistik</p>
            <p className="text-sm text-blue-900 leading-relaxed">{cp.policyRationale}</p>
          </div>

          {/* Characteristics Grid */}
          <div>
            <p className="text-sm font-semibold text-[#002C5F] mb-3">Profil Variabel (vs Rata-rata Nasional)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {Object.entries(cp.characteristics).map(([key, ch]) => (
                <div key={key} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 text-center">
                  <p className="text-[10px] text-gray-500 mb-1 leading-tight">
                    {FEATURE_LABELS[key] || ch.label}
                  </p>
                  <span
                    className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: CONDITION_COLORS[ch.condition] || "#6B7280" }}
                  >
                    {ch.condition}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">
                    rasio: {ch.ratio.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Provinces */}
          <div>
            <p className="text-sm font-semibold text-[#002C5F] mb-2">Provinsi</p>
            <div className="flex flex-wrap gap-1.5">
              {cp.provinces.map((prov) => (
                <span
                  key={prov}
                  className="text-xs px-2.5 py-1 rounded-full border"
                  style={{ borderColor: color, color: color, backgroundColor: `${color}10` }}
                >
                  {prov}
                </span>
              ))}
            </div>
          </div>

          {/* Policy Directions */}
          <div>
            <p className="text-sm font-semibold text-[#002C5F] mb-3">Arah Kebijakan</p>
            <div className="space-y-4">
              {cp.policyDirections.map((pd, idx) => (
                <div
                  key={idx}
                  className="bg-linear-to-br from-gray-50 to-blue-50 p-5 rounded-lg border border-gray-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[#002C5F] font-semibold mb-1">{pd.direction}</h4>
                      <p className="text-sm text-gray-600 leading-relaxed mb-3">{pd.rationale}</p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500 font-semibold">Arah Aksi:</p>
                        <ul className="space-y-1.5">
                          {pd.actions.map((action, actionIdx) => (
                            <li key={actionIdx} className="flex items-start gap-2 text-sm text-gray-700">
                              <span
                                className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                                style={{ backgroundColor: color }}
                              />
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
