# Manual K-Means + Policy Template

File:
- `investra-gov-apps-data-prep/templates/Manual_KMeans_Policy_Template.xlsx`

Tujuan:
- Verifikasi manual alur preprocessing + K-Means pada sampel kecil.
- Menunjukkan inertia dan konvergensi iterasi.
- Memverifikasi logika rekomendasi kebijakan berbasis ratio.

## Sheet Overview

1. `README`
- Ringkasan tujuan dan langkah pakai template.

2. `Raw_Data`
- Data sampel panel (15 observasi, 5 provinsi x 3 tahun: 2022-2024).
- Kolom mengikuti struktur backend:
  - `provinsi`, `year`, `pmdn_rp`, `fdi_rp`, `pdrb_per_kapita`, `ipm`, `kemiskinan`, `akses_listrik`, `tpt`.

3. `Prep_Z`
- Transformasi:
  - `log1p` untuk `pmdn_rp`, `fdi_rp`, `pdrb_per_kapita`.
  - Variabel lain tetap nilai asli.
- Standardisasi:
  - Z-score dengan normalisasi within-year (panel).

4. `Init_Centroid`
- Titik awal centroid untuk 4 cluster.
- Ubah `row_source` untuk mengganti centroid awal.

5. `Iter_1` dan `Iter_2`
- Hitung jarak kuadrat ke centroid (`dist_c1..dist_c4`).
- Tentukan assignment cluster (minimum jarak).
- Hitung `min_dist` per observasi.

6. `Centroid_1` dan `Centroid_2`
- Update centroid dari hasil assignment iterasi sebelumnya.

7. `Metrics`
- Jumlah observasi.
- Perubahan assignment antar iterasi.
- Konvergensi.
- Inertia Iter_1 dan Iter_2.
- Count anggota per cluster.

8. `Cluster_Summary`
- Rata-rata indikator per cluster (skala asli, bukan z-score).
- Jumlah anggota cluster.

9. `Policy_Ratio`
- Pilih cluster pada `B1`.
- Hitung:
  - `cluster_mean`
  - `national_mean`
  - `ratio = cluster_mean / national_mean`
  - `category` (`VERY_LOW..VERY_HIGH`)
  - `condition`
- Untuk indikator invers (`kemiskinan`, `tpt`), interpretasi kondisi dibalik:
  - Ratio tinggi = kondisi lebih buruk.

10. `Policy_Rules`
- Ringkasan rule mapping kebijakan sesuai `PolicyService`.

## Catatan Penting

- Template ini untuk demonstrasi manual saat seminar, bukan pengganti pipeline backend penuh.
- Backend menjalankan analisis multi-run untuk stabilitas cluster (`consensus runs` + `n_init`), sedangkan Excel ini hanya ilustrasi iteratif manual.
