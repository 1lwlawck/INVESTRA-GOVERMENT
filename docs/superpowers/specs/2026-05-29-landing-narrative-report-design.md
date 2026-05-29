# Landing Page Naratif — Laporan Visual yang Bercerita

**Tanggal:** 2026-05-29
**Status:** Disetujui untuk implementasi
**File utama:** `investra-gov-apps-fe/src/pages/landing/LandingPage.tsx`

## Tujuan

Mengubah landing page publik INVESTRA dari kumpulan section yang berdiri sendiri
menjadi satu **laporan visual naratif** yang mengalir dari atas ke bawah, di mana
tiap section saling terhubung lewat transisi dan dibingkai sebagai bab bernomor.

Target audiens: seluruh elemen masyarakat (awam → pembuat kebijakan). Nada:
informatif, bertanggung jawab, mudah dipahami — bukan katalog fitur.

## Prinsip Naratif

Cerita mengalir dalam tiga benang yang relevan, diurutkan jadi babak:
1. **Ketimpangan** (hook) → menyadarkan ada masalah
2. **Memahami pola** (metode + temuan) → menjawab "seberapa timpang & bagaimana polanya"
3. **Aksi personal** (cek daerah) → "bagaimana dengan daerah saya"
4. **Implikasi** → "apa artinya, apa batasannya"

Tiap bab punya **kalimat masuk** (jembatan dari bab sebelumnya) dan **kalimat keluar**
(pengait ke bab berikutnya). Inilah yang membuat section terasa terhubung.

## Struktur Bab

| Bab | Judul | Asal section | Perubahan |
|-----|-------|--------------|-----------|
| 01 | Gambaran Umum | **BARU** | Hook ketimpangan, angka dari data |
| 02 | Cara Kerja | Metode (dipindah ke atas) | + eyebrow bab + transisi |
| 03 | Temuan | Hasil cluster + Peta (digabung) | + callout temuan kunci + transisi |
| 04 | Cek Daerah Anda | Cek Daerah (tetap) | + eyebrow bab + transisi |
| 05 | Implikasi & Catatan | Batasan + FAQ (digabung) | + eyebrow bab |
| 06 | Tentang Data | Footer (tetap) | tidak diubah |

Hero tetap di paling atas, di luar penomoran bab.

## Detail Per Bab

### Bab 01 — Gambaran Umum (komponen baru)

Section putih setelah hero. Eyebrow "01 — Gambaran Umum", headline naratif,
2-3 angka kunci + kalimat penjelas.

**Sumber angka (dihitung di frontend dari `summary.clusters`):**
- `provinceCount` per kelompok (Tinggi/Sedang/Rendah) — selalu tersedia
- Persentase tiap kelompok dari total provinsi
- Rasio provinsi kelompok tertinggi : terendah (penanda ketimpangan)

Catatan: `PublicClusterSummary` TIDAK punya statistik investasi nominal
(`{ clusterId, label, color, provinceCount, observationCount, provinces[],
policyRationale, dominantFactor }`). Jadi hook memakai jumlah & proporsi provinsi,
bukan rupiah. Ini tetap kuat menunjukkan ketimpangan.

**Copy:** lihat bagian "Copy Naratif" di bawah.

### Bab 02 — Cara Kerja

Band deep-green existing. Tambah eyebrow "02 — Cara Kerja", kalimat masuk dari Bab 01,
kalimat keluar ke Bab 03. Konten PCA/K-Means/Data + tooltip glossary tidak diubah.

### Bab 03 — Temuan

Gabungan section Hasil (cluster cards) + Peta choropleth dalam satu bab.
Eyebrow "03 — Temuan". Tambah callout temuan kunci di atas cards, dihitung dari
`clusters[].provinces` (mis. dominasi geografis kelompok tertinggi). Urutan:
callout → cluster cards → peta. Kalimat keluar mengantar ke Bab 04.

### Bab 04 — Cek Daerah Anda

Section interaktif existing, tidak diubah fungsinya. Tambah eyebrow "04" + kalimat
masuk/keluar. Form + panel hasil (indicator bars + glossary) tetap.

### Bab 05 — Implikasi & Catatan

Gabungan Batasan + FAQ. Eyebrow "05 — Implikasi & Catatan". Batasan sebagai
"cara membaca yang bertanggung jawab", FAQ accordion di bawahnya.

### Bab 06 — Tentang Data

Footer existing, tidak diubah.

## Navigasi Bab (Chapter Rail)

Komponen baru `ChapterRail`:
- Daftar `01–05` vertikal, sticky di sisi kiri layar
- Hidden di `< lg` (mobile)
- Bab aktif ter-highlight via IntersectionObserver (reuse pola `useScrollReveal`)
- Klik nomor → `scrollIntoView` ke bab itu (id anchor)
- Muncul setelah scroll melewati hero, sembunyi saat di footer
- Styling Cohere: near-black aktif, muted inaktif

## Komponen Baru

| Komponen | File | Tugas |
|----------|------|-------|
| `ChapterRail` | `src/pages/landing/ChapterRail.tsx` | Navigasi bab sticky kiri |
| `OverviewSection` | inline di LandingPage atau `OverviewSection.tsx` | Bab 01 hook |
| `ChapterEyebrow` | helper kecil inline | Label "0X — Judul" konsisten |

Helper perhitungan (inline di LandingPage atau util):
- `computeOverviewStats(clusters)` → { tinggi, sedang, rendah, total, dominantRegionNote }

## Yang Dipertahankan (tidak disentuh)

- Semua logika data: `loadPublicData`, `handleCheckProvince`, state, API calls
- Komponen: `PublicChoroplethMap`, `IndicatorRow`, `TermTooltip`, `Reveal`,
  `CountUp`, `SmoothScroll`, `useParallax`
- Design system Cohere + animasi yang sudah ada

## Verifikasi

- `npx tsc --noEmit` bersih
- `npx vite build` sukses
- Tidak ada perubahan backend (semua dari data publik yang sudah ada)
- Cek manual: scroll dari atas ke bawah terasa mengalir, chapter rail highlight
  mengikuti scroll, klik bab melompat benar

## Out of Scope

- Tidak ada PDF download (report = laporan visual di halaman)
- Tidak ada endpoint/field backend baru
- Tidak mengubah dashboard internal
