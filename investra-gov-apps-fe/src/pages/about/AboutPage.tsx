import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Target, Users, BookOpen, Code, Database, TrendingUp } from 'lucide-react';
import { GarudaEmblem } from "@/components/atoms/media/GarudaEmblem";

export function AboutView() {
  useDocumentTitle('Tentang');
  const methodology = [
    {
      title: 'Principal Component Analysis (PCA)',
      icon: TrendingUp,
      description: 'Metode statistik untuk reduksi dimensionalitas data dengan mempertahankan varians maksimal',
      details: [
        'Mengidentifikasi komponen utama dari 12 variabel investasi',
        'Menjelaskan 100% varians dengan 4 komponen utama',
        'Membantu mengidentifikasi faktor dominan ketimpangan'
      ]
    },
    {
      title: 'K-Means Clustering',
      icon: Target,
      description: 'Algoritma pembelajaran mesin untuk mengelompokkan provinsi berdasarkan kesamaan karakteristik',
      details: [
        'Menggunakan metode elbow untuk menentukan jumlah klaster optimal',
        'Menghasilkan 3 klaster berdasarkan tingkat investasi',
        'Akurasi clustering mencapai 92.3%'
      ]
    },
    {
      title: 'Analisis Data Spasial',
      icon: Database,
      description: 'Visualisasi geografis untuk memahami pola distribusi investasi',
      details: [
        'Peta interaktif Indonesia dengan color coding per klaster',
        'Identifikasi pola spasial ketimpangan regional',
        'Integrasi data PDRB, IPM, dan nilai investasi'
      ]
    }
  ];

  const dataSourcesData = [
    { source: 'Data Statistik Nasional', variables: 'PDRB, IPM, Ketenagakerjaan' },
    { source: 'Data Investasi', variables: 'Data PMA dan PMDN' },
    { source: 'Data Infrastruktur', variables: 'Indeks Infrastruktur' },
    { source: 'Data Kesehatan & Pendidikan', variables: 'Akses Kesehatan & Pendidikan' },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Emblem */}
      <Card className="border-2 border-[#F9B233] shadow-lg bg-linear-to-br from-white to-blue-50">
        <CardContent className="p-4 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            <GarudaEmblem size={80} className="sm:hidden shrink-0" />
            <GarudaEmblem size={100} className="hidden sm:block shrink-0" />
            <div className="flex-1">
              <h2 className="text-[#002C5F] mb-3">
                Tentang Sistem Analisis
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Dashboard Analisis Ketimpangan Distribusi Investasi Antar Wilayah di Indonesia adalah sistem berbasis data 
                yang dirancang untuk mendukung pengambilan keputusan tingkat nasional dalam mengatasi disparitas investasi regional. 
                Sistem ini mengintegrasikan metode Principal Component Analysis (PCA) dan K-Means Clustering untuk memberikan wawasan 
                komprehensif tentang pola ketimpangan dan rekomendasi kebijakan yang terfokus.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Objectives */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F] flex items-center gap-2">
            <Target className="h-6 w-6 text-[#F9B233]" />
            Tujuan Sistem
          </CardTitle>
          <CardDescription>Objektif dan sasaran pengembangan dashboard</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-[#002C5F] mb-2">1. Identifikasi Ketimpangan</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Mengidentifikasi dan mengukur tingkat ketimpangan investasi antar provinsi menggunakan metode kuantitatif berbasis PCA
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-[#002C5F] mb-2">2. Klasifikasi Wilayah</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Mengelompokkan provinsi berdasarkan karakteristik investasi untuk strategi pembangunan yang lebih terarah
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-[#002C5F] mb-2">3. Rekomendasi Kebijakan</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Menyediakan rekomendasi kebijakan spesifik berbasis data untuk setiap klaster wilayah
              </p>
            </div>

            <div className="p-5 bg-white border border-gray-200 rounded-lg">
              <h4 className="text-[#002C5F] mb-2">4. Monitoring & Evaluasi</h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Memfasilitasi monitoring progress pembangunan dan evaluasi efektivitas kebijakan yang diimplementasikan
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#F9B233]" />
            Metodologi Analisis
          </CardTitle>
          <CardDescription>Pendekatan dan metode yang digunakan dalam sistem</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {methodology.map((method, index) => {
            const Icon = method.icon;
            return (
              <div key={index} className="p-5 bg-linear-to-br from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-lg border-2 border-[#002C5F]">
                    <Icon className="h-6 w-6 text-[#002C5F]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-[#002C5F] mb-2">{method.title}</h4>
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{method.description}</p>
                    <ul className="space-y-1">
                      {method.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#F9B233] mt-1.5 shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Data Sources */}
      <Card className="border-2 border-[#002C5F]/20 shadow-md">
        <CardHeader className="bg-linear-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <CardTitle className="text-[#002C5F] flex items-center gap-2">
            <Database className="h-6 w-6 text-[#F9B233]" />
            Sumber Data
          </CardTitle>
          <CardDescription>Institusi penyedia data dan variabel yang digunakan</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-3">
            {dataSourcesData.map((item, index) => (
              <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <div className="flex-1">
                  <h4 className="text-[#002C5F]">{item.source}</h4>
                </div>
                <div className="text-sm text-gray-600">
                  {item.variables}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Technical Info */}
      <Card className="bg-linear-to-br from-[#002C5F] to-[#003D7A] text-white shadow-lg">
        <CardHeader className="border-b border-white/20">
          <CardTitle className="flex items-center gap-2">
            <Code className="h-6 w-6 text-[#F9B233]" />
            Informasi Teknis
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-[#F9B233] mb-2">Versi Sistem</h4>
              <p className="text-gray-200">v2.1.0 (November 2024)</p>
            </div>
            <div>
              <h4 className="text-[#F9B233] mb-2">Teknologi</h4>
              <p className="text-gray-200">React, TypeScript, Recharts</p>
            </div>
            <div>
              <h4 className="text-[#F9B233] mb-2">Lisensi</h4>
              <p className="text-gray-200">INVESTRA - Pemerintah Indonesia</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact */}
      <Card className="border-2 border-[#F9B233] shadow-md">
        <CardHeader>
          <CardTitle className="text-[#002C5F] flex items-center gap-2">
            <Users className="h-6 w-6 text-[#F9B233]" />
            Kontak & Dukungan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-[#002C5F]">investra@mail.com</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Telepon</p>
              <p className="text-[#002C5F]">+62 21 3193 6207</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Alamat</p>
              <p className="text-[#002C5F]">Jakarta, Indonesia</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Website</p>
              <p className="text-[#002C5F]">investra.vercel.app</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}