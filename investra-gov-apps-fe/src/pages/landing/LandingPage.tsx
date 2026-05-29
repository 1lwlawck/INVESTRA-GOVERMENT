import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GarudaEmblem } from '@/components/atoms/media/GarudaEmblem';
import { ImageWithFallback } from '@/components/atoms/media/ImageWithFallback';
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
    <div className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#beranda" className="flex items-center gap-3">
            <GarudaEmblem size={42} />
            <div>
              <div className="text-sm font-bold tracking-wide text-[#002C5F]">INVESTRA</div>
              <div className="text-xs text-gray-500">Portal Analisis Investasi Wilayah</div>
            </div>
          </a>
          <nav className="hidden items-center gap-6 text-sm text-gray-600 md:flex">
            <a href="#cek-daerah" className="hover:text-[#002C5F]">
              Cek Daerah
            </a>
            <a href="#hasil" className="hover:text-[#002C5F]">
              Hasil
            </a>
            <a href="#metode" className="hover:text-[#002C5F]">
              Data & Metode
            </a>
            <a href="#batasan" className="hover:text-[#002C5F]">
              Batasan
            </a>
          </nav>
          <Button
            onClick={() => navigate('/login')}
            className="bg-[#002C5F] text-white hover:bg-[#003D7A]"
            size="sm"
          >
            <User className="mr-2 size-4" />
            Login Pengelola
          </Button>
        </div>
      </header>

      <main>
        <section id="beranda" className="relative min-h-screen overflow-hidden">
          <ImageWithFallback
            src={heroImage}
            alt="Panorama skyline Jakarta saat senja"
            className="absolute inset-0 size-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-r from-[#002C5F]/95 via-[#002C5F]/80 to-[#002C5F]/25" />
          <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-16 sm:px-6">
            <div className="max-w-3xl text-white">
              <Badge className="mb-5 bg-[#F9B233] text-[#002C5F] hover:bg-[#F9B233]">
                Informasi Publik
              </Badge>
              <h1 className="mb-5 text-3xl font-bold leading-tight sm:text-5xl">
                Pahami posisi investasi daerah Anda berdasarkan data
              </h1>
              <p className="mb-8 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
                INVESTRA membantu masyarakat membaca hasil analisis ketimpangan investasi antar
                provinsi. Anda dapat melihat daerah masuk kelompok apa, indikator apa yang
                digunakan, dan bagaimana hasilnya perlu ditafsirkan.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="bg-white text-[#002C5F] hover:bg-gray-100">
                  <a href="#cek-daerah">
                    Cek Daerah Saya
                    <ArrowRight className="ml-2 size-5" />
                  </a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  className="border border-white/50 bg-white/10 text-white hover:bg-white/20"
                >
                  <a href="#metode">
                    Lihat Data & Metode
                    <BookOpen className="ml-2 size-5" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-gray-200 bg-white py-6">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Database className="size-9 text-[#002C5F]" />
              <div>
                <p className="text-xs text-gray-500">Periode Data</p>
                <p className="font-semibold text-[#002C5F]">
                  {loading ? 'Memuat...' : formatYearRange(summary?.yearRange)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="size-9 text-[#059669]" />
              <div>
                <p className="text-xs text-gray-500">Provinsi Dalam Analisis</p>
                <p className="font-semibold text-[#002C5F]">
                  {loading ? 'Memuat...' : `${totalProvinceCount || provinces.length} provinsi`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <GitBranch className="size-9 text-[#F9B233]" />
              <div>
                <p className="text-xs text-gray-500">Kelompok Hasil Analisis</p>
                <p className="font-semibold text-[#002C5F]">
                  {loading ? 'Memuat...' : `${summary?.analysis.k ?? 0} cluster`}
                </p>
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

        <section id="cek-daerah" className="bg-gray-50 py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 max-w-3xl">
              <Badge className="mb-3 bg-[#002C5F] text-white hover:bg-[#002C5F]">
                Cek Daerah Saya
              </Badge>
              <h2 className="mb-3 text-2xl font-bold text-[#002C5F] sm:text-3xl">
                Lihat provinsi Anda masuk kelompok investasi mana
              </h2>
              <p className="text-gray-600">
                Pilih nama provinsi untuk melihat cluster hasil analisis, ringkasan indikator, dan
                penjelasan singkat yang mudah dibaca.
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="self-start rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <Label htmlFor="province-search" className="text-[#002C5F]">
                  Nama Provinsi
                </Label>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
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
                      className="pl-9 pr-9"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => setProvinceMenuOpen((open) => !open)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      aria-label="Tampilkan daftar provinsi"
                    >
                      <ArrowRight
                        className={`size-4 rotate-90 transition-transform ${provinceMenuOpen ? '-rotate-90' : ''}`}
                      />
                    </button>
                    {provinceMenuOpen && (
                      <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 shadow-lg">
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
                              className="block w-full px-4 py-2 text-left text-sm font-semibold text-[#002C5F] hover:bg-blue-50"
                            >
                              {name}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-gray-500">
                            Provinsi tidak ditemukan.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleCheckProvince}
                    disabled={checkingProvince || loading || Boolean(error)}
                    className="bg-[#002C5F] text-white hover:bg-[#003D7A]"
                  >
                    {checkingProvince ? 'Memeriksa...' : 'Cek Hasil'}
                  </Button>
                </div>
                {provinceError && (
                  <Alert className="mt-4 border-red-500 bg-red-50">
                    <AlertCircle className="size-4 text-red-600" />
                    <AlertDescription className="text-red-700">{provinceError}</AlertDescription>
                  </Alert>
                )}
                <div className="mt-6 rounded-lg bg-blue-50 p-4 text-sm text-[#002C5F]">
                  <Info className="mb-2 size-5" />
                  Hasil cluster menunjukkan kemiripan pola data provinsi dibandingkan provinsi lain,
                  bukan penilaian mutlak terhadap keberhasilan daerah.
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                {!provinceResult ? (
                  <div className="flex min-h-72 flex-col items-center justify-center text-center text-gray-500">
                    <MapPin className="mb-3 size-12 text-gray-300" />
                    <p className="font-medium text-gray-700">Hasil daerah akan muncul di sini</p>
                    <p className="mt-1 max-w-md text-sm">
                      Setelah provinsi dipilih, sistem menampilkan cluster, periode data, dan
                      indikator utama hasil analisis.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Provinsi</p>
                        <h3 className="text-2xl font-bold text-[#002C5F]">
                          {provinceResult.province}
                        </h3>
                      </div>
                      <Badge
                        className="w-fit text-white hover:opacity-90"
                        style={{ backgroundColor: provinceResult.cluster.color }}
                      >
                        {provinceResult.cluster.label}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-2 text-sm font-semibold text-[#002C5F]">Artinya</p>
                      <p className="text-sm leading-relaxed text-gray-700">
                        {provinceResult.cluster.policyRationale || provinceResult.plainLanguageNote}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">
                          Periode {formatYearRange(provinceResult.yearRange)}
                        </Badge>
                        <Badge variant="outline">
                          Konsistensi {(provinceResult.cluster.consistencyRatio * 100).toFixed(1)}%
                        </Badge>
                        {provinceResult.cluster.dominantFactor && (
                          <Badge variant="outline">{provinceResult.cluster.dominantFactor}</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 font-semibold text-[#002C5F]">Ringkasan Indikator</h4>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {indicatorOrder.map((key) => {
                          const item = provinceResult.indicators[key];
                          if (!item) return null;
                          return (
                            <div key={key} className="rounded-lg border border-gray-200 p-3">
                              <p className="text-xs text-gray-500">{item.label}</p>
                              <p className="mt-1 font-semibold text-[#002C5F]">
                                {formatIndicatorValue(key, item.value)}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {provinceResult.cluster.policyDirections.length > 0 && (
                      <div>
                        <h4 className="mb-3 font-semibold text-[#002C5F]">
                          Arah Kebijakan Umum Cluster
                        </h4>
                        <div className="space-y-3">
                          {provinceResult.cluster.policyDirections.map((item) => (
                            <div key={item.direction} className="rounded-lg bg-blue-50 p-4">
                              <p className="font-semibold text-[#002C5F]">{item.direction}</p>
                              <p className="mt-1 text-sm text-gray-700">{item.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="hasil" className="bg-white py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Badge className="mb-3 bg-[#F9B233] text-[#002C5F] hover:bg-[#F9B233]">
                  Ringkasan Hasil
                </Badge>
                <h2 className="text-2xl font-bold text-[#002C5F] sm:text-3xl">
                  Sebaran cluster provinsi
                </h2>
              </div>
              {summary && (
                <p className="text-sm text-gray-500">
                  Analisis {summary.analysis.code || summary.analysis.id} - k={summary.analysis.k}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {(summary?.clusters ?? []).map((cluster) => (
                <Card key={cluster.clusterId} className="border border-gray-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className="size-4 rounded-full"
                        style={{ backgroundColor: cluster.color }}
                      />
                      <Badge variant="outline">{cluster.provinceCount} provinsi</Badge>
                    </div>
                    <CardTitle className="text-base text-[#002C5F]">{cluster.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="min-h-16 text-sm text-gray-600">
                      {cluster.policyRationale ||
                        'Cluster ini berisi provinsi dengan karakteristik indikator yang mirip.'}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {cluster.provinces.slice(0, 4).map((province) => (
                        <Badge key={province} variant="secondary">
                          {province}
                        </Badge>
                      ))}
                      {cluster.provinces.length > 4 && (
                        <Badge variant="secondary">+{cluster.provinces.length - 4}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="metode" className="bg-gray-50 py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-10 max-w-3xl">
              <Badge className="mb-3 bg-[#002C5F] text-white hover:bg-[#002C5F]">
                Data & Metode
              </Badge>
              <h2 className="mb-3 text-2xl font-bold text-[#002C5F] sm:text-3xl">
                Bagaimana hasil dihitung
              </h2>
              <p className="text-gray-600">
                Sistem memakai data panel provinsi, menstandarkan indikator agar dapat dibandingkan,
                lalu menggunakan PCA dan K-Means untuk membaca pola.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <Database className="mb-4 size-8 text-[#002C5F]" />
                <h3 className="mb-3 font-semibold text-[#002C5F]">Data yang Digunakan</h3>
                <div className="space-y-2">
                  {(summary?.variables ?? []).map((variable) => (
                    <div
                      key={variable.key}
                      className="flex items-start gap-2 text-sm text-gray-700"
                    >
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#059669]" />
                      <span>{variable.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <BarChart3 className="mb-4 size-8 text-[#F9B233]" />
                <h3 className="mb-3 font-semibold text-[#002C5F]">PCA</h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  PCA merangkum banyak indikator menjadi beberapa dimensi utama. Tujuannya membantu
                  melihat faktor yang paling kuat membedakan kondisi antar provinsi.
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <GitBranch className="mb-4 size-8 text-[#DC2626]" />
                <h3 className="mb-3 font-semibold text-[#002C5F]">K-Means</h3>
                <p className="text-sm leading-relaxed text-gray-700">
                  K-Means mengelompokkan provinsi yang polanya mirip. Label seperti investasi tinggi
                  atau rendah adalah cara membaca posisi relatif antar provinsi dalam dataset.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="batasan" className="bg-white py-16 scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <Badge className="mb-3 bg-[#DC2626] text-white hover:bg-[#DC2626]">
                  Transparansi
                </Badge>
                <h2 className="mb-3 text-2xl font-bold text-[#002C5F] sm:text-3xl">
                  Batasan pembacaan hasil
                </h2>
                <p className="text-gray-600">
                  Bagian ini penting agar hasil tidak dibaca berlebihan. Analisis membantu memahami
                  pola, tetapi keputusan kebijakan tetap memerlukan kajian lanjutan.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {(
                  summary?.limitations ?? [
                    'Hasil publik akan muncul setelah analisis dijalankan oleh pengelola.',
                    'Data dan metode perlu dibaca bersama konteks wilayah.',
                    'Dashboard penuh hanya untuk pengelola sistem.',
                  ]
                ).map((item) => (
                  <div key={item} className="rounded-lg border border-gray-200 bg-gray-50 p-5">
                    <ShieldCheck className="mb-3 size-6 text-[#002C5F]" />
                    <p className="text-sm leading-relaxed text-gray-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#0A1929] text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-3">
                <GarudaEmblem size={42} />
                <div>
                  <p className="font-bold text-white">INVESTRA</p>
                  <p className="text-xs text-gray-400">Portal Analisis Investasi Wilayah</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-gray-400">
                Sistem analisis ketimpangan investasi antar provinsi di Indonesia berbasis data
                resmi BKPM dengan metode PCA dan K-Means.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
                Navigasi
              </h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#beranda" className="text-gray-400 transition hover:text-[#F9B233]">
                    Beranda
                  </a>
                </li>
                <li>
                  <a href="#cek-daerah" className="text-gray-400 transition hover:text-[#F9B233]">
                    Cek Daerah
                  </a>
                </li>
                <li>
                  <a href="#hasil" className="text-gray-400 transition hover:text-[#F9B233]">
                    Hasil Analisis
                  </a>
                </li>
                <li>
                  <a href="#metode" className="text-gray-400 transition hover:text-[#F9B233]">
                    Data &amp; Metode
                  </a>
                </li>
                <li>
                  <a href="#batasan" className="text-gray-400 transition hover:text-[#F9B233]">
                    Batasan
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
                Sumber Data
              </h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <Database className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <span>BKPM - Realisasi Investasi</span>
                </li>
                <li className="flex items-start gap-2">
                  <FileText className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <span>BPS - Indikator Sosial Ekonomi</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <span>Periode 2019 - 2024</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">
                Kontak
              </h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <span>Jakarta, Indonesia</span>
                </li>
                <li className="flex items-start gap-2">
                  <Mail className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <a href="mailto:info@investra.id" className="transition hover:text-[#F9B233]">
                    info@investra.id
                  </a>
                </li>
                <li className="flex items-start gap-2">
                  <Phone className="mt-0.5 size-4 shrink-0 text-[#F9B233]" />
                  <span>(021) 0000-0000</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} INVESTRA. Seluruh hasil analisis bersifat
              informatif.
            </p>
            <p className="text-xs text-gray-500">
              Dibangun untuk mendukung transparansi data investasi wilayah Indonesia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
