import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileText,
  GitBranch,
  Info,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { publicApi } from '@/core/api/public.api';
import type {
  PublicAnalysisSummary,
  PublicProvinceAnalysis,
  PublicProvinceListItem,
} from '@/core/api/public.api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GarudaEmblem } from '@/components/atoms/media/GarudaEmblem';
import { ImageWithFallback } from '@/components/atoms/media/ImageWithFallback';
import { Reveal } from '@/components/atoms/motion/Reveal';
import { SmoothScroll } from '@/components/atoms/motion/SmoothScroll';
import { CountUp } from '@/components/atoms/motion/CountUp';
import { useParallax } from '@/hooks/ui/useParallax';
import { TermTooltip } from './TermTooltip';
import { IndicatorRow } from './IndicatorRow';
import { PublicChoroplethMap } from './PublicChoroplethMap';
import { ChapterRail } from './ChapterRail';
import { OverviewSection } from './OverviewSection';
import heroImage from '@/assets/images/premium_photo-1733317260639-6fb8eb703c78.avif';

const indicatorOrder = [
  'pmdnRp',
  'fdiRp',
  'pdrbPerKapita',
  'ipm',
  'kemiskinan',
  'aksesListrik',
  'tpt',
];

function formatYearRange(range?: { start: number | null; end: number | null }): string {
  if (!range?.start && !range?.end) return 'Belum tersedia';
  if (range.start === range.end) return String(range.end);
  return `${range.start ?? '-'}-${range.end ?? '-'}`;
}

function formatLargeCurrency(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `Rp ${(value / 1_000_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })} T`;
  }
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', {
      maximumFractionDigits: 2,
    })} M`;
  }
  return `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
}

function formatIndicatorValue(key: string, value: number): string {
  if (key === 'pmdnRp' || key === 'fdiRp' || key === 'pdrbPerKapita') {
    return formatLargeCurrency(value);
  }
  if (key === 'ipm') return value.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return `${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`;
}

function publicErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Data publik belum dapat dimuat.';
}

export function LandingPage() {
  useDocumentTitle('Beranda');
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PublicAnalysisSummary | null>(null);
  const [provinces, setProvinces] = useState<PublicProvinceListItem[]>([]);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [provinceResult, setProvinceResult] = useState<PublicProvinceAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingProvince, setCheckingProvince] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [provinceMenuOpen, setProvinceMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const heroPhotoRef = useParallax<HTMLDivElement>({ range: -50 });

  // Toggle navbar border + backdrop only after the user starts scrolling.
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPublicData() {
      setLoading(true);
      setError(null);
      try {
        const [summaryData, provinceData] = await Promise.all([
          publicApi.getSummary(),
          publicApi.getProvinces(),
        ]);
        if (!active) return;
        setSummary(summaryData);
        setProvinces(provinceData);
      } catch (err) {
        if (!active) return;
        setError(publicErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPublicData();
    return () => {
      active = false;
    };
  }, []);

  const provinceNames = useMemo(
    () => provinces.map((item) => item.provinsi).sort((a, b) => a.localeCompare(b, 'id-ID')),
    [provinces],
  );
  const filteredProvinceNames = useMemo(() => {
    const query = selectedProvince.trim().toLowerCase();
    const names = query
      ? provinceNames.filter((name) => name.toLowerCase().includes(query))
      : provinceNames;
    return names.slice(0, 12);
  }, [provinceNames, selectedProvince]);

  const handleCheckProvince = async () => {
    const province = selectedProvince.trim();
    if (!province) {
      setProvinceError('Pilih atau ketik nama provinsi terlebih dahulu.');
      return;
    }

    setCheckingProvince(true);
    setProvinceError(null);
    setProvinceResult(null);
    try {
      const result = await publicApi.getProvinceAnalysis(province);
      setProvinceResult(result);
    } catch (err) {
      setProvinceError(publicErrorMessage(err));
    } finally {
      setCheckingProvince(false);
    }
  };

  const totalProvinceCount =
    summary?.clusters.reduce((total, cluster) => total + cluster.provinceCount, 0) ?? 0;

  return (
    <SmoothScroll>
      <div className="min-h-screen bg-white text-[#212121]">
        {/* Announcement bar — Cohere style: thin black strip above nav */}
        <div className="flex h-9 items-center justify-center bg-[#17171c] px-4 text-center">
          <p className="text-xs text-white/90">
            Data resmi BKPM &amp; BPS &middot; Analisis investasi 38 provinsi Indonesia
          </p>
        </div>

        <header
          className={`sticky top-0 z-50 transition-all duration-300 ${
            isScrolled
              ? 'border-b border-[#d9d9dd] bg-white/95 backdrop-blur'
              : 'border-b border-transparent bg-white'
          }`}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
            <a href="#beranda" className="flex items-center gap-3">
              <GarudaEmblem size={42} />
              <div>
                <div
                  className="text-sm font-semibold tracking-tight text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  INVESTRA
                </div>
                <div className="text-xs text-[#93939f]">Portal Analisis Investasi Wilayah</div>
              </div>
            </a>
            <nav className="hidden items-center gap-8 text-sm text-[#212121] md:flex">
              <a href="#bab-04" className="transition hover:text-[#17171c]">
                Cek Daerah
              </a>
              <a href="#bab-03" className="transition hover:text-[#17171c]">
                Hasil
              </a>
              <a href="#bab-02" className="transition hover:text-[#17171c]">
                Data &amp; Metode
              </a>
              <a href="#bab-05" className="transition hover:text-[#17171c]">
                Batasan
              </a>
            </nav>
            <Button
              onClick={() => navigate('/login')}
              className="rounded-full bg-[#17171c] px-6 text-white hover:bg-[#2a2a32]"
              size="sm"
            >
              <User className="mr-2 size-4" />
              Login Pengelola
            </Button>
          </div>
        </header>

        <main>
          {/* Hero — Cohere editorial style: white canvas, large display headline,
            split layout with media card on the right, stats pills below CTAs. */}
          <section id="beranda" className="relative overflow-hidden bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
              {/* Left: copy */}
              <div className="animate-fade-in">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d9d9dd] bg-white px-3 py-1">
                  <span className="size-1.5 rounded-full bg-[#ff7759]" />
                  <span className="text-xs font-medium tracking-wide text-[#212121]">
                    Informasi publik &middot; Data resmi 2022&ndash;2024
                  </span>
                </div>

                <h1
                  className="mb-6 text-[clamp(2.5rem,6vw,5rem)] font-normal leading-[1.02] tracking-[-0.03em] text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  Lihat posisi investasi
                  <br />
                  <span className="text-[#003c33]">provinsi Anda.</span>
                </h1>

                <p className="mb-10 max-w-xl text-lg leading-relaxed text-[#616161]">
                  INVESTRA mengelompokkan 38 provinsi Indonesia berdasarkan kemiripan kondisi
                  investasi dan pembangunan. Pilih daerah Anda untuk melihat di kelompok mana ia
                  berada dan apa artinya, dalam bahasa yang mudah dibaca.
                </p>

                <div className="mb-10 flex flex-col gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-[#17171c] px-8 py-6 text-base text-white hover:bg-[#2a2a32]"
                  >
                    <a href="#bab-04">
                      Cek Daerah Saya
                      <ArrowRight className="ml-2 size-5" />
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="px-2 py-6 text-base text-[#212121] underline-offset-4 hover:bg-transparent hover:underline"
                  >
                    <a href="#bab-02">
                      Pelajari metodenya
                      <ArrowRight className="ml-2 size-4" />
                    </a>
                  </Button>
                </div>

                {/* Stats pills — were a separate section, now part of hero */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#d9d9dd] pt-6">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                      Periode
                    </p>
                    <p className="mt-1 text-base font-medium text-[#17171c]">
                      {loading ? '—' : formatYearRange(summary?.yearRange)}
                    </p>
                  </div>
                  <div className="hidden h-10 w-px bg-[#d9d9dd] sm:block" />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                      Provinsi
                    </p>
                    <p className="mt-1 text-base font-medium text-[#17171c]">
                      {loading ? '—' : <CountUp value={totalProvinceCount || provinces.length} />}
                    </p>
                  </div>
                  <div className="hidden h-10 w-px bg-[#d9d9dd] sm:block" />
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                      Kelompok
                    </p>
                    <p className="mt-1 text-base font-medium text-[#17171c]">
                      {loading ? (
                        '—'
                      ) : (
                        <CountUp value={summary?.analysis.k ?? 0} suffix=" cluster" />
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: media card — rounded photo with deep-green frame, Cohere hero-photo-card style */}
              <div className="animate-fade-in">
                <div
                  ref={heroPhotoRef}
                  className="relative overflow-hidden rounded-[22px] bg-[#003c33] p-1 shadow-sm will-change-transform"
                >
                  <ImageWithFallback
                    src={heroImage}
                    alt="Panorama Jakarta saat senja"
                    className="aspect-[4/5] w-full rounded-[20px] object-cover"
                  />
                  {/* Inset console-style label */}
                  <div className="absolute bottom-4 left-4 right-4 rounded-lg bg-[#17171c]/90 p-4 backdrop-blur">
                    <p
                      className="text-[11px] font-medium uppercase tracking-wider text-[#ff7759]"
                      style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                    >
                      LIVE ANALYSIS
                    </p>
                    <p className="mt-1 text-sm text-white">
                      PCA &middot; K-Means &middot; Panel data 3 tahun
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {error && (
            <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              <Alert className="border-amber-500 bg-amber-50">
                <AlertCircle className="size-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Data publik belum tersedia</AlertTitle>
                <AlertDescription className="text-amber-800">
                  {error}. Jalankan analisis dari dashboard pengelola agar hasil publik dapat
                  ditampilkan.
                </AlertDescription>
              </Alert>
            </section>
          )}

          {/* Chapter rail — sticky left navigation, visible after hero */}
          <ChapterRail
            chapters={[
              { id: 'bab-01', num: '01', title: 'Gambaran' },
              { id: 'bab-02', num: '02', title: 'Cara Kerja' },
              { id: 'bab-03', num: '03', title: 'Temuan' },
              { id: 'bab-04', num: '04', title: 'Cek Daerah' },
              { id: 'bab-05', num: '05', title: 'Implikasi' },
            ]}
          />

          {/* Bab 01 — Gambaran Umum */}
          <OverviewSection summary={summary} />

          <section id="bab-02" className="bg-[#003c33] py-20 scroll-mt-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Reveal className="mb-12 max-w-3xl">
                <p
                  className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ffad9b]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                >
                  02 — Cara Kerja
                </p>
                <h2
                  className="mb-4 text-[clamp(1.75rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-white"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  Bagaimana pola ketimpangan ini dibaca
                </h2>
                <p className="text-lg leading-relaxed text-white/70">
                  Untuk membaca pola di balik angka tadi, sistem memakai data panel provinsi,
                  menstandarkan indikator agar dapat dibandingkan, lalu menggunakan PCA dan K-Means
                  untuk menemukan kelompok provinsi yang mirip.
                </p>
              </Reveal>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-[16px] border border-white/15 bg-white/5 p-7">
                  <Database className="mb-4 size-7 text-[#ffad9b]" />
                  <h3
                    className="mb-3 text-xl font-normal tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Data yang Digunakan
                  </h3>
                  <div className="space-y-2">
                    {(summary?.variables ?? []).map((variable) => (
                      <div
                        key={variable.key}
                        className="flex items-start gap-2 text-sm text-white/80"
                      >
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#edfce9]" />
                        <span>{variable.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[16px] border border-white/15 bg-white/5 p-7">
                  <BarChart3 className="mb-4 size-7 text-[#ffad9b]" />
                  <h3
                    className="mb-3 text-xl font-normal tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    <TermTooltip termKey="pca" accent="#ffad9b" />
                  </h3>
                  <p className="text-sm leading-relaxed text-white/80">
                    PCA merangkum banyak indikator menjadi beberapa dimensi utama. Ibarat meringkas
                    banyak nilai rapor jadi beberapa angka kunci yang paling membedakan tiap
                    provinsi.
                  </p>
                </div>

                <div className="rounded-[16px] border border-white/15 bg-white/5 p-7">
                  <GitBranch className="mb-4 size-7 text-[#ffad9b]" />
                  <h3
                    className="mb-3 text-xl font-normal tracking-tight text-white"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    <TermTooltip termKey="kmeans" accent="#ffad9b">
                      K-Means
                    </TermTooltip>
                  </h3>
                  <p className="text-sm leading-relaxed text-white/80">
                    K-Means mengelompokkan provinsi yang polanya mirip, seperti menyusun provinsi ke
                    dalam beberapa "kelompok kembar". Label tinggi atau rendah adalah posisi
                    relatif, bukan nilai mutlak.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="bab-03" className="bg-white py-20 scroll-mt-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <Reveal>
                  <p
                    className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                  >
                    03 — Temuan
                  </p>
                  <h2
                    className="text-[clamp(1.75rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    38 provinsi, 3 kelompok yang berbeda
                  </h2>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#616161]">
                    Hasilnya: provinsi terbagi jadi tiga kelompok dengan karakteristik investasi
                    yang berbeda. Inilah sebarannya — dan inilah peta wilayahnya.
                  </p>
                </Reveal>
                {summary && (
                  <p className="text-sm text-[#93939f]">
                    Analisis {summary.analysis.code || summary.analysis.id} &middot; k=
                    {summary.analysis.k}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {(summary?.clusters ?? []).map((cluster, index) => (
                  <Reveal key={cluster.clusterId} delay={index * 120}>
                    <div className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-[#d9d9dd] bg-white transition-all hover:border-[#93939f]">
                      {/* Cluster color band on top */}
                      <div className="h-2 w-full" style={{ backgroundColor: cluster.color }} />
                      <div className="flex flex-1 flex-col p-6">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <span
                            className="rounded-full px-3 py-1 text-xs font-medium text-white"
                            style={{ backgroundColor: cluster.color }}
                          >
                            {cluster.provinceCount} provinsi
                          </span>
                        </div>
                        <h3
                          className="mb-3 text-xl font-normal tracking-tight text-[#17171c]"
                          style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                        >
                          {cluster.label}
                        </h3>
                        <p className="text-sm leading-relaxed text-[#616161]">
                          {cluster.policyRationale ||
                            'Kelompok ini berisi provinsi dengan karakteristik indikator yang mirip.'}
                        </p>
                        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[#f2f2f2] pt-4">
                          {cluster.provinces.slice(0, 4).map((province) => (
                            <span
                              key={province}
                              className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#212121]"
                            >
                              {province}
                            </span>
                          ))}
                          {cluster.provinces.length > 4 && (
                            <span className="rounded-full bg-[#eeece7] px-2.5 py-0.5 text-xs text-[#93939f]">
                              +{cluster.provinces.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              {summary && summary.clusters.length > 0 && (
                <Reveal className="mt-12">
                  <h3
                    className="mb-4 text-xl font-normal tracking-tight text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Peta sebaran kelompok
                  </h3>
                  <PublicChoroplethMap clusters={summary.clusters} />
                </Reveal>
              )}
            </div>
          </section>

          <section id="bab-04" className="bg-[#eeece7] py-20 scroll-mt-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <Reveal className="mb-10 max-w-3xl">
                <p
                  className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                >
                  04 — Cek Daerah Anda
                </p>
                <h2
                  className="mb-4 text-[clamp(1.75rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  Lalu, bagaimana dengan daerah Anda?
                </h2>
                <p className="max-w-xl text-lg leading-relaxed text-[#616161]">
                  Sebaran nasional sudah jelas. Sekarang pilih nama provinsi untuk melihat kelompok
                  hasil analisis, ringkasan indikator, dan penjelasan singkat yang mudah dibaca.
                </p>
              </Reveal>

              <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="self-start rounded-[16px] border border-[#d9d9dd] bg-white p-7">
                  <Label
                    htmlFor="province-search"
                    className="text-[13px] font-medium uppercase tracking-wider text-[#93939f]"
                  >
                    Nama Provinsi
                  </Label>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#93939f]" />
                      <Input
                        id="province-search"
                        value={selectedProvince}
                        onChange={(event) => {
                          setSelectedProvince(event.target.value);
                          setProvinceMenuOpen(true);
                        }}
                        onFocus={() => setProvinceMenuOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => setProvinceMenuOpen(false), 120);
                        }}
                        placeholder="Contoh: Jawa Barat"
                        className="rounded-lg border-[#d9d9dd] pl-9 pr-9"
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => setProvinceMenuOpen((open) => !open)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#93939f]"
                        aria-label="Tampilkan daftar provinsi"
                      >
                        <ArrowRight
                          className={`size-4 rotate-90 transition-transform ${provinceMenuOpen ? '-rotate-90' : ''}`}
                        />
                      </button>
                      {provinceMenuOpen && (
                        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-lg border border-[#d9d9dd] bg-white py-2 shadow-lg">
                          {filteredProvinceNames.length > 0 ? (
                            filteredProvinceNames.map((name) => (
                              <button
                                key={name}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                  setSelectedProvince(name);
                                  setProvinceMenuOpen(false);
                                }}
                                className="block w-full px-4 py-2 text-left text-sm font-medium text-[#212121] hover:bg-[#eeece7]"
                              >
                                {name}
                              </button>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-sm text-[#93939f]">
                              Provinsi tidak ditemukan.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleCheckProvince}
                      disabled={checkingProvince || loading || Boolean(error)}
                      className="rounded-full bg-[#17171c] px-6 text-white hover:bg-[#2a2a32]"
                    >
                      {checkingProvince ? 'Memeriksa...' : 'Cek Hasil'}
                    </Button>
                  </div>
                  {provinceError && (
                    <Alert className="mt-4 border-[#b30000] bg-red-50">
                      <AlertCircle className="size-4 text-[#b30000]" />
                      <AlertDescription className="text-[#b30000]">
                        {provinceError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="mt-6 flex gap-3 rounded-lg bg-[#edfce9] p-4 text-sm text-[#003c33]">
                    <Info className="mt-0.5 size-5 shrink-0" />
                    <span>
                      Hasil cluster menunjukkan kemiripan pola data provinsi dibandingkan provinsi
                      lain, bukan penilaian mutlak terhadap keberhasilan daerah.
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[16px] border border-[#d9d9dd] bg-white">
                  {!provinceResult ? (
                    <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
                      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#eeece7]">
                        <MapPin className="size-7 text-[#93939f]" />
                      </div>
                      <p className="font-medium text-[#17171c]">Hasil daerah akan muncul di sini</p>
                      <p className="mt-2 max-w-md text-sm text-[#616161]">
                        Setelah provinsi dipilih, sistem menampilkan kelompok, periode data, dan
                        indikator utama hasil analisis.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Cluster-colored header band */}
                      <div
                        className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
                        style={{ backgroundColor: `${provinceResult.cluster.color}14` }}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="size-12 shrink-0 rounded-full"
                            style={{ backgroundColor: provinceResult.cluster.color }}
                          />
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-[#93939f]">
                              Provinsi
                            </p>
                            <h3
                              className="text-2xl font-normal tracking-tight text-[#17171c]"
                              style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                            >
                              {provinceResult.province}
                            </h3>
                          </div>
                        </div>
                        <span
                          className="w-fit rounded-full px-4 py-1.5 text-sm font-medium text-white"
                          style={{ backgroundColor: provinceResult.cluster.color }}
                        >
                          {provinceResult.cluster.label}
                        </span>
                      </div>

                      <div className="thin-scrollbar max-h-[28rem] space-y-6 overflow-y-auto p-6">
                        <div className="rounded-lg bg-[#eeece7] p-4">
                          <p className="mb-2 text-[13px] font-medium uppercase tracking-wider text-[#93939f]">
                            Artinya
                          </p>
                          <p className="text-sm leading-relaxed text-[#212121]">
                            {provinceResult.cluster.policyRationale ||
                              provinceResult.plainLanguageNote}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Badge variant="outline" className="rounded-full border-[#d9d9dd]">
                              Periode {formatYearRange(provinceResult.yearRange)}
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-[#d9d9dd]">
                              <TermTooltip termKey="konsistensi">Konsistensi</TermTooltip>{' '}
                              {(provinceResult.cluster.consistencyRatio * 100).toFixed(1)}%
                            </Badge>
                            {provinceResult.cluster.dominantFactor && (
                              <Badge variant="outline" className="rounded-full border-[#d9d9dd]">
                                {provinceResult.cluster.dominantFactor}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <h4 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-[#93939f]">
                            Ringkasan Indikator
                          </h4>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {indicatorOrder.map((key) => {
                              const item = provinceResult.indicators[key];
                              if (!item) return null;
                              return (
                                <IndicatorRow
                                  key={key}
                                  indicatorKey={key}
                                  label={item.label}
                                  value={item.value}
                                  formattedValue={formatIndicatorValue(key, item.value)}
                                />
                              );
                            })}
                          </div>
                        </div>

                        {provinceResult.cluster.policyDirections.length > 0 && (
                          <div>
                            <h4 className="mb-3 text-[13px] font-medium uppercase tracking-wider text-[#93939f]">
                              Arah Kebijakan Umum Cluster
                            </h4>
                            <div className="space-y-3">
                              {provinceResult.cluster.policyDirections.map((item) => (
                                <div
                                  key={item.direction}
                                  className="rounded-lg border-l-2 bg-[#edfce9] p-4"
                                  style={{ borderColor: provinceResult.cluster.color }}
                                >
                                  <p className="font-medium text-[#003c33]">{item.direction}</p>
                                  <p className="mt-1 text-sm text-[#212121]">{item.rationale}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section id="bab-05" className="bg-white py-20 scroll-mt-20 sm:py-24">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
              <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                <Reveal>
                  <p
                    className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                  >
                    05 — Implikasi &amp; Catatan
                  </p>
                  <h2
                    className="mb-4 text-[clamp(1.75rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]"
                    style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                  >
                    Cara membaca hasil dengan bertanggung jawab
                  </h2>
                  <p className="text-lg leading-relaxed text-[#616161]">
                    Setelah melihat sebaran nasional dan posisi daerah Anda, penting memahami apa
                    yang bisa dan tidak bisa disimpulkan dari analisis ini.
                  </p>
                </Reveal>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {(
                    summary?.limitations ?? [
                      'Hasil publik akan muncul setelah analisis dijalankan oleh pengelola.',
                      'Data dan metode perlu dibaca bersama konteks wilayah.',
                      'Dashboard penuh hanya untuk pengelola sistem.',
                    ]
                  ).map((item) => (
                    <div key={item} className="rounded-[16px] border border-[#d9d9dd] bg-white p-6">
                      <ShieldCheck className="mb-4 size-6 text-[#ff7759]" />
                      <p className="text-sm leading-relaxed text-[#212121]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* FAQ — Cara Membaca Hasil */}
          <section className="bg-[#eeece7] py-20 sm:py-24">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
              <Reveal>
                <p
                  className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[#ff7759]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', monospace" }}
                >
                  Cara Membaca Hasil
                </p>
                <h2
                  className="mb-4 text-[clamp(1.75rem,4vw,3rem)] font-normal leading-[1.1] tracking-[-0.02em] text-[#17171c]"
                  style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                >
                  Pertanyaan yang sering muncul
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-[#616161]">
                  Hasil analisis ini untuk semua kalangan. Berikut penjelasan singkat agar tidak
                  salah tafsir.
                </p>
              </Reveal>

              <Accordion type="single" collapsible className="space-y-3">
                {[
                  {
                    q: 'Apa bedanya kelompok Investasi Tinggi, Sedang, dan Rendah?',
                    a: 'Kelompok ini menunjukkan posisi relatif — bukan nilai mutlak. "Investasi Tinggi" artinya provinsi tersebut memiliki pola data yang mirip dengan provinsi-provinsi yang secara keseluruhan lebih tinggi investasinya dibanding kelompok lain. Ini bukan rapor atau peringkat resmi.',
                  },
                  {
                    q: 'Apakah hasil ini menilai kinerja pemerintah daerah?',
                    a: 'Tidak. Analisis ini hanya membaca pola kemiripan data antar provinsi. Banyak faktor di luar kendali pemerintah daerah yang mempengaruhi angka investasi, seperti kondisi geografis, sejarah industri, dan kebijakan nasional.',
                  },
                  {
                    q: 'Dari mana data ini berasal dan seberapa bisa dipercaya?',
                    a: 'Data bersumber dari BKPM (realisasi investasi) dan BPS (indikator sosial-ekonomi). Keduanya adalah lembaga resmi pemerintah Indonesia. Data diproses dengan metode statistik standar (PCA dan K-Means) yang umum digunakan dalam penelitian akademik.',
                  },
                  {
                    q: 'Mengapa provinsi saya masuk kelompok yang berbeda dari yang saya bayangkan?',
                    a: 'Pengelompokan didasarkan pada kombinasi 7 indikator sekaligus, bukan satu angka saja. Sebuah provinsi bisa memiliki investasi tinggi tapi IPM rendah, sehingga secara keseluruhan masuk kelompok yang berbeda dari ekspektasi. Lihat "Ringkasan Indikator" untuk memahami profil lengkapnya.',
                  },
                  {
                    q: 'Apa yang dimaksud dengan "konsistensi" di hasil analisis?',
                    a: 'Konsistensi menunjukkan seberapa sering provinsi berada di kelompok yang sama sepanjang periode data (2022-2024). Konsistensi 100% berarti provinsi selalu di kelompok yang sama setiap tahun. Konsistensi rendah berarti posisinya berubah-ubah antar tahun.',
                  },
                ].map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="rounded-[16px] border border-[#d9d9dd] bg-white px-6"
                  >
                    <AccordionTrigger className="py-5 text-left text-base font-medium text-[#17171c] hover:no-underline">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-relaxed text-[#616161]">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </main>

        <footer className="bg-[#17171c] text-white/70">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-1">
                <div className="flex items-center gap-3">
                  <GarudaEmblem size={42} />
                  <div>
                    <p
                      className="font-semibold text-white"
                      style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}
                    >
                      INVESTRA
                    </p>
                    <p className="text-xs text-white/50">Portal Analisis Investasi Wilayah</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-white/50">
                  Sistem analisis ketimpangan investasi antar provinsi di Indonesia berbasis data
                  resmi BKPM dengan metode PCA dan K-Means.
                </p>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
                  Navigasi
                </h4>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#beranda" className="transition hover:text-[#ff7759]">
                      Beranda
                    </a>
                  </li>
                  <li>
                    <a href="#bab-04" className="transition hover:text-[#ff7759]">
                      Cek Daerah
                    </a>
                  </li>
                  <li>
                    <a href="#bab-03" className="transition hover:text-[#ff7759]">
                      Hasil Analisis
                    </a>
                  </li>
                  <li>
                    <a href="#bab-02" className="transition hover:text-[#ff7759]">
                      Data &amp; Metode
                    </a>
                  </li>
                  <li>
                    <a href="#bab-05" className="transition hover:text-[#ff7759]">
                      Batasan
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
                  Sumber Data
                </h4>
                <ul className="space-y-2 text-sm text-white/50">
                  <li className="flex items-start gap-2">
                    <Database className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <span>BKPM - Realisasi Investasi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <FileText className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <span>BPS - Indikator Sosial Ekonomi</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <span>Periode 2019 - 2024</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-white">
                  Kontak
                </h4>
                <ul className="space-y-3 text-sm text-white/50">
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <span>Jakarta, Indonesia</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <a href="mailto:info@investra.id" className="transition hover:text-[#ff7759]">
                      info@investra.id
                    </a>
                  </li>
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 size-4 shrink-0 text-[#ff7759]" />
                    <span>(021) 0000-0000</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/30">
                &copy; {new Date().getFullYear()} INVESTRA. Seluruh hasil analisis bersifat
                informatif.
              </p>
              <p className="text-xs text-white/30">
                Dibangun untuk mendukung transparansi data investasi wilayah Indonesia.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </SmoothScroll>
  );
}
