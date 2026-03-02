# Investra Data Prep

Folder ini dipakai untuk memproses data mentah menjadi data final sebelum diupload ke backend INVESTRA.

## Struktur

- `data/raw`: taruh file sumber (`.csv` atau `.xlsx`)
- `data/interim`: hasil transform sementara
- `data/final`: hasil akhir siap upload
- `notebooks/01_Preprocess_Investra.ipynb`: notebook ETL utama
- `notebooks/02_Build_Panel_From_Raw.ipynb`: notebook merge multi-sumber raw menjadi panel tahunan + final dataset

## Skema Output Final

Notebook akan menghasilkan CSV dengan kolom wajib berikut (sesuai backend):

- `provinsi`
- `pmdn_rp`
- `fdi_rp`
- `pdrb_per_kapita`
- `ipm`
- `kemiskinan`
- `akses_listrik`
- `tpt`

## Cara Pakai Cepat

1. Buat virtual environment dan install dependency:

```powershell
cd investra-gov-apps-data-prep
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Taruh data mentah ke `data/raw/` (contoh: `raw_dataset_2024.xlsx`)

3. Jalankan notebook:

```powershell
jupyter lab
```

4. Buka `notebooks/01_Preprocess_Investra.ipynb`, run semua sel.

5. Ambil file final dari `data/final/` lalu upload di halaman Dataset pada aplikasi.

## Notebook Panel (Opsional, Direkomendasikan)

Jika data mentah kamu masih terpisah per indikator/tahun, gunakan:

- `notebooks/02_Build_Panel_From_Raw.ipynb`

Output dari notebook ini:

- `data/interim/investra_panel_<start>_<end>_<timestamp>.csv` (panel provinsi-tahun)
- `data/final/investra_final_avg_2022_2024_<timestamp>.csv` (rata-rata window tahun)
- `data/final/investra_final_2024_<timestamp>.csv` (snapshot 1 tahun)
