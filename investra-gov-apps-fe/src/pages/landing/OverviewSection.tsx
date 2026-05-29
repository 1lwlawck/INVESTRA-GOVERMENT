import type { PublicAnalysisSummary } from '@/core/api/public.api';
import { CountUp } from '@/components/atoms/motion/CountUp';
import { Reveal } from '@/components/atoms/motion/Reveal';

interface OverviewSectionProps {
  summary: PublicAnalysisSummary | null;
}

const DISPLAY_FONT = "'Space Grotesk', 'Inter', sans-serif";
const MONO_FONT = "'Space Grotesk', 'Inter', monospace";

/**
 * Bab 01 — Gambaran Umum.
 *
 * Hook section that opens the report with the inequality story. Numbers are
 * computed from `summary.clusters` (PublicClusterSummary) since the public
 * payload does not include nominal investment statistics — provinceCount and
 * proportions are enough to make the disparity vivid.
 *
 * Convention: clusters[0] = Investasi Tinggi, [1] Sedang, [2] Rendah (k=3).
 */
export function OverviewSection({ summary }: OverviewSectionProps) {
  const clusters = summary?.clusters ?? [];
  const total = clusters.reduce((sum, c) => sum + c.provinceCount, 0);

  // Keep the visual order Tinggi → Sedang → Rendah even if the API order shifts.
  const byId = (id: number) => clusters.find((c) => c.clusterId === id);
  const tinggi = byId(0);
  const sedang = byId(1);
  const rendah = byId(2);

  const ratio =
    tinggi && rendah && rendah.provinceCount > 0
      ? (tinggi.provinceCount / rendah.provinceCount).toFixed(1)
      : null;

  return (
    <section
      id="bab-01"
      className="scroll-mt-20 bg-white py-20 sm:py-24"
      aria-labelledby="bab-01-title"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mb-12 max-w-3xl">
          <p
            className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
            style={{ fontFamily: MONO_FONT }}
          >
            01 — Gambaran Umum
          </p>
          <h2
            id="bab-01-title"
            className="mb-6 text-[clamp(2rem,4.5vw,3.25rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]"
            style={{ fontFamily: DISPLAY_FONT }}
          >
            Investasi di Indonesia
            <br />
            <span className="text-[#003c33]">tidak tersebar merata.</span>
          </h2>
          <p className="text-lg leading-relaxed text-[#616161]">
            Dari {total || 38} provinsi, hanya sebagian yang menarik mayoritas investasi. Analisis
            ini mengelompokkan provinsi berdasarkan kemiripan kondisi — dan pola ketimpangannya
            langsung terlihat.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {[tinggi, sedang, rendah].map((cluster, idx) => {
            if (!cluster) return null;
            const pct = total > 0 ? ((cluster.provinceCount / total) * 100).toFixed(1) : '0';
            return (
              <Reveal key={cluster.clusterId} delay={idx * 120}>
                <div className="overflow-hidden rounded-2xl border border-[#d9d9dd] bg-white">
                  <div className="h-1.5 w-full" style={{ backgroundColor: cluster.color }} />
                  <div className="p-6">
                    <p
                      className="mb-3 text-[11px] font-medium uppercase tracking-wider"
                      style={{ color: cluster.color, fontFamily: MONO_FONT }}
                    >
                      {cluster.label}
                    </p>
                    <p
                      className="text-[clamp(2.5rem,4vw,3.5rem)] font-normal leading-none tracking-tight text-[#17171c]"
                      style={{ fontFamily: DISPLAY_FONT }}
                    >
                      <CountUp value={cluster.provinceCount} />
                    </p>
                    <p className="mt-2 text-sm text-[#616161]">
                      provinsi <span className="text-[#93939f]">· {pct}% dari total</span>
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {ratio && (
          <Reveal className="mt-10 max-w-2xl border-l-2 border-[#ff7759] pl-5" delay={400}>
            <p className="text-base leading-relaxed text-[#212121]">
              Ada{' '}
              <span className="font-medium text-[#17171c]" style={{ fontFamily: DISPLAY_FONT }}>
                {ratio}× lebih banyak
              </span>{' '}
              provinsi di kelompok investasi tinggi dibanding kelompok terendah. Pertanyaannya:
              bagaimana pola ini terbentuk?
            </p>
          </Reveal>
        )}
      </div>
    </section>
  );
}
