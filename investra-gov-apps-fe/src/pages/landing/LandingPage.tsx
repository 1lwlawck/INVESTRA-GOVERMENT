import { useNavigate } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Button } from "@/components/ui/button";
import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";
import { ImageWithFallback } from "@/components/atoms/media/ImageWithFallback";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Search,
  User,
  ArrowRight,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Linkedin,
  MapPin,
  TrendingUp,
  BarChart3,
  FileText,
  Database,
  Globe,
  Layers,
  Upload,
  Cpu,
  GitBranch,
  Target,
  Monitor,
  HelpCircle,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

export function LandingPage() {
  useDocumentTitle('Beranda');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center justify-between">
            {/* Left Logos */}
            <div className="flex items-center gap-3 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12">
                  <GarudaEmblem />
                </div>
                <div className="border-l-2 border-gray-300 pl-3">
                  <div className="text-[#002C5F] text-sm" style={{ fontWeight: 700, letterSpacing: '1px' }}>
                    INVESTRA
                  </div>
                  <div className="text-gray-500 text-xs" style={{ fontWeight: 400 }}>
                    Investment Analytics
                  </div>
                </div>
              </div>
              <div className="h-8 w-px bg-gray-300 hidden sm:block"></div>
              <div className="hidden sm:flex items-center gap-2">
                <div className="text-[#002C5F] text-xs" style={{ fontWeight: 600 }}>
                  INDONESIA
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="hidden md:block flex-1 max-w-md mx-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari Berita atau Informasi..."
                  className="w-full px-4 py-2 pr-10 text-sm border border-gray-300 rounded-full focus:outline-none focus:border-[#002C5F]"
                />
                <Button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Search className="h-4 w-4 text-gray-400" />
                </Button>
              </div>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-4">
              <div className="text-xs text-gray-600">
                <div style={{ fontWeight: 600 }}>TOPIK</div>
                <div style={{ fontWeight: 400 }}>PILIHAN</div>
              </div>
              <Button 
                onClick={() => navigate('/login')}
                size="sm"
                className="bg-[#002C5F] hover:bg-[#001F4D] text-white"
                style={{ fontWeight: 600 }}
              >
                <User className="h-4 w-4 mr-1" />
                LOGIN
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white border-b-2 border-gray-200 sticky top-0 z-50 shadow-sm hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center">
            <a 
              href="#hero" 
              className="flex items-center gap-2 px-5 py-4 text-[#002C5F] hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            </a>
            
            <a href="#tentang" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              PROFIL
            </a>
            
            <a href="#cara-kerja" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              METODOLOGI
            </a>
            
            <a href="#fitur" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              FITUR
            </a>
            
            <a href="#dashboard" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              DASHBOARD
            </a>
            
            <a href="#faq" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              FAQ
            </a>
            
            <a href="#kontak" className="px-5 py-4 text-gray-700 hover:bg-gray-50 text-sm flex items-center gap-1 transition-colors" style={{ fontWeight: 500 }}>
              KONTAK
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div id="hero" className="relative h-170 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-r from-[#002C5F]/90 via-[#002C5F]/70 to-transparent z-10"></div>
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1761387787737-c850f5db6fa3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmRvbmVzaWElMjBnb3Zlcm5tZW50JTIwYnVpbGRpbmd8ZW58MXx8fHwxNzYyNDM0MzI1fDA&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Hero Background"
          className="w-full h-full object-cover"
        />
        
        <div className="absolute inset-0 z-20 flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full">
            <div className="max-w-3xl pr-4 sm:pr-0">
              <div className="inline-block bg-[#DC2626] text-white px-3 sm:px-4 py-1 rounded text-xs mb-2 sm:mb-4" style={{ fontWeight: 700 }}>
                SISTEM TERBARU
              </div>
              <h1 className="text-white text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 sm:mb-6" style={{ fontWeight: 700, lineHeight: '1.2' }}>
                Sistem Analisis Ketimpangan Distribusi Investasi Antar Wilayah di Indonesia
              </h1>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mb-4 sm:mb-8 leading-relaxed" style={{ fontWeight: 400 }}>
                Platform berbasis PCA dan K-Means Clustering untuk monitoring ketimpangan ekonomi regional 34 provinsi Indonesia
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <Button 
                  onClick={() => navigate('/login')}
                  size="lg"
                  className="bg-white text-[#002C5F] hover:bg-gray-100 gap-2"
                  style={{ fontWeight: 600 }}
                >
                  Akses Dashboard
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <Button className="text-white flex items-center gap-2 hover:gap-3 transition-all" style={{ fontWeight: 500 }}>
                  <span className="border-b border-white/50">Baca Selengkapnya</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Icons */}
        <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-20 hidden sm:flex items-center gap-3">
          <Button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
            <Facebook className="h-5 w-5 text-white" />
          </Button>
          <Button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
            <Twitter className="h-5 w-5 text-white" />
          </Button>
          <Button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
            <Instagram className="h-5 w-5 text-white" />
          </Button>
          <Button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
            <Youtube className="h-5 w-5 text-white" />
          </Button>
          <Button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors flex items-center justify-center">
            <Linkedin className="h-5 w-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Statistik Ringkas Section */}
      <div className="relative -mt-16 z-30 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-[#002C5F] hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-[#002C5F]/10 rounded-full mx-auto mb-3">
                <Globe className="h-6 w-6 text-[#002C5F]" />
              </div>
              <div className="text-3xl sm:text-4xl text-[#002C5F] mb-1" style={{ fontWeight: 800 }}>38</div>
              <div className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Provinsi Dianalisis</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-[#F9B233] hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-[#F9B233]/10 rounded-full mx-auto mb-3">
                <Database className="h-6 w-6 text-[#F9B233]" />
              </div>
              <div className="text-3xl sm:text-4xl text-[#002C5F] mb-1" style={{ fontWeight: 800 }}>7</div>
              <div className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Variabel Analisis</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-[#059669] hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-[#059669]/10 rounded-full mx-auto mb-3">
                <Layers className="h-6 w-6 text-[#059669]" />
              </div>
              <div className="text-3xl sm:text-4xl text-[#002C5F] mb-1" style={{ fontWeight: 800 }}>3</div>
              <div className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Cluster Klasifikasi</div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 text-center border-t-4 border-[#DC2626] hover:shadow-xl transition-shadow">
              <div className="flex items-center justify-center w-12 h-12 bg-[#DC2626]/10 rounded-full mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-[#DC2626]" />
              </div>
              <div className="text-3xl sm:text-4xl text-[#002C5F] mb-1" style={{ fontWeight: 800 }}>2</div>
              <div className="text-sm text-gray-500" style={{ fontWeight: 500 }}>Metode Analisis</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tentang Sistem Section */}
      <div id="tentang" className="bg-white py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block bg-[#002C5F]/10 text-[#002C5F] px-4 py-1.5 rounded-full text-xs mb-4" style={{ fontWeight: 600 }}>
                TENTANG SISTEM
              </div>
              <h2 className="text-[#002C5F] text-2xl sm:text-3xl mb-6" style={{ fontWeight: 700, lineHeight: '1.3' }}>
                Mengapa INVESTRA Dibangun?
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed" style={{ fontWeight: 400 }}>
                Ketimpangan distribusi investasi antar wilayah merupakan tantangan utama pembangunan nasional. Beberapa provinsi menerima porsi investasi yang sangat besar, sementara wilayah lain tertinggal jauh.
              </p>
              <p className="text-gray-600 mb-8 leading-relaxed" style={{ fontWeight: 400 }}>
                INVESTRA hadir sebagai sistem analitik berbasis data yang menggabungkan metode <strong>Principal Component Analysis (PCA)</strong> dan <strong>K-Means Clustering</strong> untuk memetakan pola ketimpangan dan memberikan rekomendasi kebijakan yang terukur.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Mengidentifikasi faktor dominan penyebab ketimpangan ekonomi</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Mengelompokkan provinsi berdasarkan karakteristik investasi</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Menyusun rekomendasi kebijakan spesifik per cluster wilayah</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-[#059669] mt-0.5 shrink-0" />
                  <span className="text-gray-700 text-sm" style={{ fontWeight: 500 }}>Visualisasi data interaktif untuk pengambil keputusan</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-[#002C5F] to-[#003D7A] rounded-2xl p-8 text-white">
                <h3 className="text-xl mb-6" style={{ fontWeight: 700 }}>7 Variabel Analisis</h3>
                <div className="space-y-4">
                  {[
                    { label: 'PMDN', desc: 'Penanaman Modal Dalam Negeri' },
                    { label: 'PMA/FDI', desc: 'Penanaman Modal Asing' },
                    { label: 'PDRB', desc: 'Produk Domestik Regional Bruto per Kapita' },
                    { label: 'IPM', desc: 'Indeks Pembangunan Manusia' },
                    { label: 'Kemiskinan', desc: 'Persentase Penduduk Miskin' },
                    { label: 'Listrik', desc: 'Rasio Akses Listrik' },
                    { label: 'TPT', desc: 'Tingkat Pengangguran Terbuka' },
                  ].map((v) => (
                    <div key={v.label} className="flex items-center gap-3 bg-white/10 rounded-lg px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-[#F9B233] shrink-0" />
                      <div>
                        <span style={{ fontWeight: 600 }}>{v.label}</span>
                        <span className="text-white/70 text-sm ml-2" style={{ fontWeight: 400 }}>— {v.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-[#F9B233]/20 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-[#002C5F]/20 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Cara Kerja Section */}
      <div id="cara-kerja" className="bg-gray-50 py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-block bg-[#002C5F]/10 text-[#002C5F] px-4 py-1.5 rounded-full text-xs mb-4" style={{ fontWeight: 600 }}>
              METODOLOGI
            </div>
            <h2 className="text-[#002C5F] text-2xl sm:text-3xl mb-4" style={{ fontWeight: 700 }}>
              Cara Kerja Sistem
            </h2>
            <div className="w-20 h-1 bg-[#F9B233] mx-auto mb-4"></div>
            <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontWeight: 400 }}>
              Empat tahapan analisis yang mengubah data mentah menjadi insight dan rekomendasi kebijakan
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Input Data',
                desc: 'Upload dataset investasi 38 provinsi dengan 7 variabel ekonomi dari sumber terpercaya (BPS)',
                color: '#002C5F',
              },
              {
                step: '02',
                icon: Cpu,
                title: 'Analisis PCA',
                desc: 'Reduksi dimensi data menggunakan Principal Component Analysis untuk menemukan faktor dominan',
                color: '#F9B233',
              },
              {
                step: '03',
                icon: GitBranch,
                title: 'K-Means Clustering',
                desc: 'Pengelompokan provinsi menjadi 3 cluster berdasarkan kesamaan karakteristik investasi',
                color: '#059669',
              },
              {
                step: '04',
                icon: Target,
                title: 'Rekomendasi',
                desc: 'Penyusunan strategi kebijakan spesifik untuk setiap cluster guna mengurangi ketimpangan',
                color: '#DC2626',
              },
            ].map((item) => (
              <div key={item.step} className="relative group">
                <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all h-full border border-gray-100">
                  <div className="text-5xl text-gray-100 absolute top-4 right-4" style={{ fontWeight: 800 }}>
                    {item.step}
                  </div>
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-xl mb-5"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="h-7 w-7" style={{ color: item.color }} />
                  </div>
                  <h3 className="text-[#002C5F] text-lg mb-3" style={{ fontWeight: 600 }}>
                    {item.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="fitur" className="bg-white py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-[#002C5F] text-2xl sm:text-3xl mb-4" style={{ fontWeight: 700 }}>
              Fitur Unggulan Sistem
            </h2>
            <div className="w-20 h-1 bg-[#F9B233] mx-auto mb-4"></div>
            <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontWeight: 400 }}>
              INVESTRA menyediakan berbagai tools analitik untuk monitoring dan evaluasi ketimpangan investasi regional
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <BarChart3 className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                Analisis PCA
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Principal Component Analysis untuk identifikasi faktor dominan ketimpangan ekonomi regional
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <TrendingUp className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                K-Means Clustering
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Klasifikasi 34 provinsi menjadi 3 cluster berdasarkan tingkat investasi dan pembangunan
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <MapPin className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                Peta Interaktif
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Visualisasi geografis distribusi cluster investasi dengan kode warna untuk setiap provinsi
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <FileText className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                Rekomendasi Kebijakan
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Strategi pembangunan spesifik untuk setiap cluster dan provinsi berbasis analisis data
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <BarChart3 className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                Dashboard Real-time
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Monitoring metrik kunci ketimpangan investasi dengan visualisasi grafik yang interaktif
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-4">
                <FileText className="h-8 w-8 text-[#002C5F]" />
              </div>
              <h3 className="text-[#002C5F] mb-3" style={{ fontWeight: 600 }}>
                Laporan PDF
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed" style={{ fontWeight: 400 }}>
                Export laporan komprehensif dalam format PDF untuk disebarluaskan ke pemangku kepentingan
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Dashboard Section */}
      <div id="dashboard" className="bg-gray-50 py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-block bg-[#002C5F]/10 text-[#002C5F] px-4 py-1.5 rounded-full text-xs mb-4" style={{ fontWeight: 600 }}>
              PREVIEW
            </div>
            <h2 className="text-[#002C5F] text-2xl sm:text-3xl mb-4" style={{ fontWeight: 700 }}>
              Tampilan Dashboard
            </h2>
            <div className="w-20 h-1 bg-[#F9B233] mx-auto mb-4"></div>
            <p className="text-gray-600 max-w-2xl mx-auto" style={{ fontWeight: 400 }}>
              Antarmuka yang intuitif dan informatif untuk memudahkan analisis data investasi regional
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="bg-gradient-to-br from-[#002C5F] to-[#003D7A] rounded-2xl p-4 sm:p-6 shadow-2xl">
              {/* Mock Browser Bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="flex-1 ml-3">
                  <div className="bg-white/10 rounded-md px-4 py-1.5 text-xs text-white/60 max-w-sm" style={{ fontWeight: 400 }}>
                    investra.go.id/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard Preview Content */}
              <div className="bg-[#f8fafc] rounded-xl p-6 sm:p-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-1" style={{ fontWeight: 500 }}>Total PMDN</div>
                    <div className="text-lg text-[#002C5F]" style={{ fontWeight: 700 }}>Rp 1.245 T</div>
                    <div className="text-xs text-[#059669] mt-1" style={{ fontWeight: 500 }}>+12.3%</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-1" style={{ fontWeight: 500 }}>Total FDI</div>
                    <div className="text-lg text-[#002C5F]" style={{ fontWeight: 700 }}>Rp 1.308 T</div>
                    <div className="text-xs text-[#059669] mt-1" style={{ fontWeight: 500 }}>+8.7%</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-1" style={{ fontWeight: 500 }}>Avg IPM</div>
                    <div className="text-lg text-[#002C5F]" style={{ fontWeight: 700 }}>72.14</div>
                    <div className="text-xs text-[#059669] mt-1" style={{ fontWeight: 500 }}>+0.45</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-3" style={{ fontWeight: 500 }}>Distribusi Cluster Provinsi</div>
                    <div className="flex items-end gap-2 h-24">
                      {[65, 40, 80, 55, 90, 45, 70, 35, 85, 50, 60, 75].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i % 3 === 0 ? '#002C5F' : i % 3 === 1 ? '#F9B233' : '#059669',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="text-xs text-gray-400 mb-3" style={{ fontWeight: 500 }}>Peta Sebaran Investasi</div>
                    <div className="flex items-center justify-center h-24">
                      <div className="relative">
                        <MapPin className="h-10 w-10 text-[#002C5F]/20" />
                        <MapPin className="h-6 w-6 text-[#DC2626] absolute -top-1 left-6" />
                        <MapPin className="h-8 w-8 text-[#059669] absolute top-2 left-12" />
                        <MapPin className="h-5 w-5 text-[#F9B233] absolute top-4 -left-4" />
                      </div>
                      <div className="ml-4 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-[#DC2626]"></div>Cluster Tinggi</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-[#F9B233]"></div>Cluster Sedang</div>
                        <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-2 h-2 rounded-full bg-[#059669]"></div>Cluster Rendah</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#002C5F]/5 via-[#F9B233]/5 to-[#059669]/5 rounded-3xl blur-2xl -z-10"></div>
          </div>

          <div className="text-center mt-10">
            <Button
              onClick={() => navigate('/login')}
              size="lg"
              className="bg-[#002C5F] hover:bg-[#001F4D] text-white gap-2"
              style={{ fontWeight: 600 }}
            >
              <Monitor className="h-5 w-5" />
              Lihat Dashboard Lengkap
            </Button>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div id="faq" className="bg-white py-16 sm:py-20 scroll-mt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-block bg-[#002C5F]/10 text-[#002C5F] px-4 py-1.5 rounded-full text-xs mb-4" style={{ fontWeight: 600 }}>
              <HelpCircle className="inline h-3 w-3 mr-1 -mt-0.5" />
              FAQ
            </div>
            <h2 className="text-[#002C5F] text-2xl sm:text-3xl mb-4" style={{ fontWeight: 700 }}>
              Pertanyaan Umum
            </h2>
            <div className="w-20 h-1 bg-[#F9B233] mx-auto mb-4"></div>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="faq-1" className="bg-gray-50 rounded-xl border-none px-6">
              <AccordionTrigger className="text-[#002C5F] text-left" style={{ fontWeight: 600 }}>
                Apa itu INVESTRA?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                INVESTRA adalah sistem analisis ketimpangan distribusi investasi antar wilayah di Indonesia. Platform ini menggunakan metode PCA (Principal Component Analysis) dan K-Means Clustering untuk menganalisis data investasi 38 provinsi dan memberikan rekomendasi kebijakan berbasis data.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="bg-gray-50 rounded-xl border-none px-6">
              <AccordionTrigger className="text-[#002C5F] text-left" style={{ fontWeight: 600 }}>
                Data apa saja yang digunakan dalam analisis?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                Sistem menganalisis 7 variabel utama: PMDN (Penanaman Modal Dalam Negeri), PMA/FDI (Penanaman Modal Asing), PDRB per Kapita, IPM (Indeks Pembangunan Manusia), Persentase Kemiskinan, Rasio Akses Listrik, dan TPT (Tingkat Pengangguran Terbuka). Data bersumber dari BPS.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="bg-gray-50 rounded-xl border-none px-6">
              <AccordionTrigger className="text-[#002C5F] text-left" style={{ fontWeight: 600 }}>
                Apa perbedaan PCA dan K-Means Clustering?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                PCA (Principal Component Analysis) digunakan untuk mereduksi dimensi data dan menemukan faktor-faktor dominan yang mempengaruhi ketimpangan. Sedangkan K-Means Clustering mengelompokkan 38 provinsi ke dalam 3 cluster berdasarkan kesamaan karakteristik investasi dan pembangunan.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="bg-gray-50 rounded-xl border-none px-6">
              <AccordionTrigger className="text-[#002C5F] text-left" style={{ fontWeight: 600 }}>
                Bagaimana cara mengakses sistem?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                Untuk mengakses dashboard dan fitur analisis, Anda perlu login dengan akun yang terdaftar. Klik tombol "Login" pada halaman utama dan masukkan kredensial yang telah diberikan oleh administrator sistem.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="bg-gray-50 rounded-xl border-none px-6">
              <AccordionTrigger className="text-[#002C5F] text-left" style={{ fontWeight: 600 }}>
                Apa output dari hasil analisis?
              </AccordionTrigger>
              <AccordionContent className="text-gray-600 leading-relaxed">
                Output analisis meliputi: visualisasi PCA (scree plot, biplot, loading matrix), hasil clustering 3 kelompok provinsi, peta interaktif sebaran cluster, statistik deskriptif per cluster, dan rekomendasi kebijakan spesifik untuk setiap kelompok wilayah. Semua hasil dapat di-eksport dalam format PDF.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-linear-to-r from-[#002C5F] to-[#003D7A] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-white text-2xl sm:text-3xl mb-4" style={{ fontWeight: 700 }}>
            Akses Sistem INVESTRA Sekarang
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto" style={{ fontWeight: 400 }}>
            Login untuk menggunakan seluruh fitur analisis dan dashboard monitoring ketimpangan investasi regional
          </p>
          <Button 
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-[#F9B233] hover:bg-[#E5A200] text-[#002C5F] gap-2"
            style={{ fontWeight: 700 }}
          >
            <User className="h-5 w-5" />
            LOGIN SISTEM
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer id="kontak" className="bg-[#1a1a1a] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12">
                  <GarudaEmblem />
                </div>
                <div>
                  <div className="text-lg" style={{ fontWeight: 700 }}>INVESTRA</div>
                  <div className="text-xs text-gray-400" style={{ fontWeight: 400 }}>Investment Analytics</div>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed" style={{ fontWeight: 400 }}>
                Sistem Analisis Ketimpangan Distribusi Investasi Antar Wilayah di Indonesia
              </p>
            </div>

            <div>
              <h4 className="mb-4" style={{ fontWeight: 700 }}>NAVIGASI</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#hero" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Beranda</a></li>
                <li><a href="#tentang" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Tentang</a></li>
                <li><a href="#fitur" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Fitur</a></li>
                <li><a href="#dashboard" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Dashboard</a></li>
                <li><a href="#kontak" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Kontak</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4" style={{ fontWeight: 700 }}>TAUTAN</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Beranda</a></li>
                <li><a href="#" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>Dokumentasi</a></li>
                <li><a href="#" className="hover:text-white transition-colors" style={{ fontWeight: 400 }}>GitHub</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4" style={{ fontWeight: 700 }}>KONTAK</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span style={{ fontWeight: 400 }}>Jakarta, Indonesia</span>
                </li>
                <li style={{ fontWeight: 400 }}>Email: investra@mail.com</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-400" style={{ fontWeight: 400 }}>
                © 2026 INVESTRA - Hak Cipta Dilindungi Undang-Undang.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Youtube className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
