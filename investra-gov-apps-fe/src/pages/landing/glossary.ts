/**
 * Plain-language explanations of technical terms used across the public
 * landing page. Written for a general audience (not analysts), per the
 * "harus informatif untuk seluruh masyarakat" guidance.
 */
export interface GlossaryEntry {
  term: string;
  short: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  pca: {
    term: 'PCA',
    short:
      'Principal Component Analysis. Cara meringkas banyak indikator jadi beberapa angka kunci yang paling membedakan tiap provinsi, seperti merangkum banyak nilai rapor jadi inti.',
  },
  kmeans: {
    term: 'K-Means',
    short:
      'Metode mengelompokkan provinsi yang kondisinya mirip ke dalam beberapa "kelompok kembar", berdasarkan kemiripan data, bukan penilaian baik/buruk.',
  },
  cluster: {
    term: 'Cluster / Klaster',
    short:
      'Kelompok provinsi dengan pola data yang mirip. Label seperti "Investasi Tinggi" menunjukkan posisi relatif terhadap provinsi lain, bukan nilai mutlak.',
  },
  ipm: {
    term: 'IPM',
    short:
      'Indeks Pembangunan Manusia. Ukuran kualitas hidup (kesehatan, pendidikan, ekonomi) dalam skala 0-100. Makin tinggi makin baik.',
  },
  pdrb: {
    term: 'PDRB per Kapita',
    short:
      'Produk Domestik Regional Bruto dibagi jumlah penduduk. Gambaran rata-rata output ekonomi tiap orang di sebuah provinsi.',
  },
  pmdn: {
    term: 'PMDN',
    short: 'Penanaman Modal Dalam Negeri, yaitu investasi yang berasal dari dalam negeri.',
  },
  pma: {
    term: 'PMA / FDI',
    short: 'Penanaman Modal Asing (Foreign Direct Investment), yaitu investasi dari luar negeri.',
  },
  tpt: {
    term: 'TPT',
    short:
      'Tingkat Pengangguran Terbuka, yaitu persentase angkatan kerja yang sedang mencari pekerjaan. Makin rendah makin baik.',
  },
  konsistensi: {
    term: 'Konsistensi',
    short:
      'Seberapa sering provinsi ini berada di kelompok yang sama sepanjang periode data. Makin tinggi, makin stabil posisinya.',
  },
};
