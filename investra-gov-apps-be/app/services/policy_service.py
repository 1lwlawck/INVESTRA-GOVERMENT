"""
Policy Service – data-driven policy recommendation engine.

Generates cluster-specific policy directions based strictly on:
  1. Cluster summary statistics (mean per variable)
  2. National average values
  3. PCA loadings and dominant components
  4. Rule-based mapping logic

Thresholding uses ratio = cluster_mean / national_mean:
  VERY_LOW  : ratio < 0.50
  LOW       : 0.50 ≤ ratio < 0.90
  MEDIUM    : 0.90 ≤ ratio < 1.10
  HIGH      : 1.10 ≤ ratio < 1.50
  VERY_HIGH : ratio ≥ 1.50

For INVERSE indicators (kemiskinan, tpt) where lower is better:
  - A high ratio means BAD condition, so interpretation is flipped.
"""


from __future__ import annotations

from app.models.province import Province
from app.services.analysis_service import _load_dataframe, get_latest_result

# ─── Constants ────────────────────────────────────────────────────────

# Variables where HIGHER value = WORSE condition
INVERSE_INDICATORS = {"kemiskinan", "tpt"}

VARIABLE_LABELS = {
    "pmdn_rp": "PMDN (Investasi Dalam Negeri)",
    "fdi_rp": "PMA (Investasi Asing)",
    "pdrb_per_kapita": "PDRB per Kapita",
    "ipm": "Indeks Pembangunan Manusia",
    "kemiskinan": "Kemiskinan",
    "akses_listrik": "Akses Listrik",
    "tpt": "Tingkat Pengangguran Terbuka",
}

# Threshold ratios (cluster_mean / national_mean)
THRESHOLDS = {
    "VERY_LOW": 0.50,
    "LOW": 0.90,
    "MEDIUM_LOW": 0.90,
    "MEDIUM_HIGH": 1.10,
    "HIGH": 1.50,
}


def _classify_ratio(ratio: float, is_inverse: bool = False) -> str:
    """Classify a ratio into a category.
    For inverse indicators, a high ratio means bad performance."""
    if is_inverse:
        # Flip: high ratio = bad → "VERY_HIGH" means very bad (kemiskinan tinggi)
        if ratio >= 1.50:
            return "VERY_HIGH"
        elif ratio >= 1.10:
            return "HIGH"
        elif ratio >= 0.90:
            return "MEDIUM"
        elif ratio >= 0.50:
            return "LOW"
        else:
            return "VERY_LOW"
    else:
        # Normal: high ratio = good
        if ratio >= 1.50:
            return "VERY_HIGH"
        elif ratio >= 1.10:
            return "HIGH"
        elif ratio >= 0.90:
            return "MEDIUM"
        elif ratio >= 0.50:
            return "LOW"
        else:
            return "VERY_LOW"


def _classify_condition(ratio: float, is_inverse: bool = False) -> str:
    """Return a human-readable condition label relative to national avg.
    For inverse indicators, HIGHER ratio = WORSE condition."""
    cat = _classify_ratio(ratio, is_inverse)

    if is_inverse:
        # kemiskinan/tpt: higher ratio means worse
        mapping = {
            "VERY_HIGH": "Sangat Buruk",
            "HIGH": "Buruk",
            "MEDIUM": "Rata-rata",
            "LOW": "Baik",
            "VERY_LOW": "Sangat Baik",
        }
    else:
        mapping = {
            "VERY_HIGH": "Sangat Tinggi",
            "HIGH": "Tinggi",
            "MEDIUM": "Rata-rata",
            "LOW": "Rendah",
            "VERY_LOW": "Sangat Rendah",
        }
    return mapping.get(cat, "Rata-rata")


# ─── PCA Interpretation ──────────────────────────────────────────────

def _interpret_pca_loadings(
    loadings: dict[str, dict[str, float]],
) -> list[dict]:
    """Interpret dominant factors from PCA loadings for PC1 and PC2."""
    interpretations = []

    for pc_name in ["PC1", "PC2"]:
        if pc_name not in loadings:
            continue
        pc_loadings = loadings[pc_name]
        # Sort by absolute value (descending)
        sorted_vars = sorted(
            pc_loadings.items(), key=lambda x: abs(x[1]), reverse=True
        )

        top_vars = sorted_vars[:3]  # top 3 dominant variables
        dominant_vars = []
        for var, loading in top_vars:
            sign = "positif" if loading > 0 else "negatif"
            label = VARIABLE_LABELS.get(var, var)
            dominant_vars.append({
                "variable": var,
                "label": label,
                "loading": round(loading, 4),
                "direction": sign,
            })

        # Determine dimension interpretation
        var_names = [v["variable"] for v in dominant_vars]
        invest_vars = {"pmdn_rp", "fdi_rp"}
        welfare_vars = {"ipm", "kemiskinan"}
        infra_vars = {"akses_listrik"}
        labor_vars = {"tpt"}

        if invest_vars & set(var_names):
            dimension = "Dimensi Investasi"
        elif welfare_vars & set(var_names):
            dimension = "Dimensi Kesejahteraan"
        elif infra_vars & set(var_names):
            dimension = "Dimensi Infrastruktur"
        elif labor_vars & set(var_names):
            dimension = "Dimensi Ketenagakerjaan"
        else:
            dimension = "Dimensi Ekonomi"

        interpretations.append({
            "component": pc_name,
            "dimension": dimension,
            "dominant_variables": dominant_vars,
        })

    return interpretations


# ─── Policy Rule Engine ──────────────────────────────────────────────

def _generate_policy_directions(
    characteristics: dict[str, dict],
) -> tuple[list[dict], str]:
    """Apply rule-based mapping to generate policy directions.
    Returns (policy_directions, dominant_factor)."""

    # Extract categories
    cats = {var: info["category"] for var, info in characteristics.items()}

    # Derived aggregates
    invest_cats = [cats.get("pmdn_rp", "MEDIUM"), cats.get("fdi_rp", "MEDIUM")]
    invest_level = (
        "HIGH" if any(c in ("HIGH", "VERY_HIGH") for c in invest_cats)
        else "LOW" if any(c in ("LOW", "VERY_LOW") for c in invest_cats)
        else "MEDIUM"
    )

    ipm_cat = cats.get("ipm", "MEDIUM")
    kemiskinan_cat = cats.get("kemiskinan", "MEDIUM")
    listrik_cat = cats.get("akses_listrik", "MEDIUM")
    tpt_cat = cats.get("tpt", "MEDIUM")

    policies: list[dict] = []
    dominant_factor = "Pertumbuhan Berimbang"

    # ── Rule 1: Investment LOW + IPM LOW + Kemiskinan HIGH ──
    if invest_level in ("LOW", "VERY_LOW") and \
       ipm_cat in ("LOW", "VERY_LOW") and \
       kemiskinan_cat in ("HIGH", "VERY_HIGH"):
        dominant_factor = "Pembangunan Dasar & Pengentasan Kemiskinan"
        policies.extend([
            {
                "direction": "Pengembangan Infrastruktur Dasar",
                "rationale": "Investasi rendah dikombinasikan dengan IPM rendah dan kemiskinan tinggi menunjukkan kebutuhan mendesak akan infrastruktur dasar.",
                "actions": [
                    "Percepatan pembangunan akses jalan, listrik, dan air bersih",
                    "Pembangunan fasilitas kesehatan dan pendidikan di wilayah terpencil",
                    "Program padat karya infrastruktur untuk penyerapan tenaga kerja lokal",
                ],
            },
            {
                "direction": "Insentif Investasi Khusus",
                "rationale": "Diperlukan insentif fiskal agresif untuk menarik investasi ke wilayah dengan daya saing rendah.",
                "actions": [
                    "Tax holiday dan keringanan pajak untuk investor di wilayah tertinggal",
                    "Kemudahan perizinan melalui sistem online satu pintu",
                    "Subsidi energi dan logistik untuk operasional industri",
                ],
            },
            {
                "direction": "Peningkatan Modal Manusia",
                "rationale": "IPM rendah mengindikasikan kualitas SDM yang perlu diperkuat melalui intervensi pendidikan dan kesehatan.",
                "actions": [
                    "Program beasiswa dan bantuan pendidikan vokasi",
                    "Peningkatan akses layanan kesehatan primer",
                    "Penempatan tenaga pendidik dan medis berkualitas",
                ],
            },
        ])

    # ── Rule 2: Investment HIGH + IPM HIGH + TPT HIGH ──
    elif invest_level in ("HIGH", "VERY_HIGH") and \
         ipm_cat in ("HIGH", "VERY_HIGH") and \
         tpt_cat in ("HIGH", "VERY_HIGH"):
        dominant_factor = "Penyelarasan Pasar Tenaga Kerja"
        policies.extend([
            {
                "direction": "Penyelarasan Pasar Tenaga Kerja",
                "rationale": "Investasi dan IPM tinggi namun pengangguran juga tinggi menunjukkan skills mismatch antara output pendidikan dan kebutuhan industri.",
                "actions": [
                    "Program link-and-match antara lembaga pendidikan dan industri",
                    "Pelatihan ulang (reskilling) tenaga kerja sesuai kebutuhan pasar",
                    "Insentif bagi perusahaan yang menyerap tenaga kerja lokal",
                ],
            },
            {
                "direction": "Diversifikasi Sektor Industri",
                "rationale": "Konsentrasi investasi yang tinggi perlu didiversifikasi untuk membuka lapangan kerja baru.",
                "actions": [
                    "Pengembangan sektor industri kreatif dan digital",
                    "Penguatan UMKM melalui pendampingan dan akses pembiayaan",
                    "Pengembangan sektor jasa bernilai tambah tinggi",
                ],
            },
            {
                "direction": "Peningkatan Kualitas Pekerjaan",
                "rationale": "Tingkat pengangguran tinggi di wilayah maju menunjukkan perlunya pekerjaan berkualitas, bukan sekadar kuantitas.",
                "actions": [
                    "Program sertifikasi kompetensi tenaga kerja",
                    "Pengembangan ekonomi digital dan gig economy yang terproteksi",
                    "Fasilitasi kewirausahaan berbasis inovasi",
                ],
            },
        ])

    # ── Rule 3: Investment HIGH + IPM LOW ──
    elif invest_level in ("HIGH", "VERY_HIGH") and \
         ipm_cat in ("LOW", "VERY_LOW"):
        dominant_factor = "Pertumbuhan Inklusif"
        policies.extend([
            {
                "direction": "Strategi Pertumbuhan Inklusif",
                "rationale": "Investasi tinggi namun IPM rendah menunjukkan manfaat ekonomi belum merata ke masyarakat.",
                "actions": [
                    "Program CSR terstruktur yang terintegrasi dengan pembangunan daerah",
                    "Persyaratan local content dan tenaga kerja lokal bagi investor",
                    "Pengembangan rantai pasok lokal yang melibatkan UMKM",
                ],
            },
            {
                "direction": "Investasi Sosial",
                "rationale": "Perlu alokasi sebagian keuntungan investasi untuk pembangunan sosial.",
                "actions": [
                    "Alokasi dana bagi hasil investasi untuk pendidikan dan kesehatan",
                    "Program pendidikan vokasi berbasis kebutuhan industri lokal",
                    "Penguatan layanan kesehatan masyarakat di sekitar kawasan industri",
                ],
            },
        ])

    # ── Rule 4: Investment LOW + IPM MEDIUM + Infrastructure LOW ──
    elif invest_level in ("LOW", "VERY_LOW") and \
         ipm_cat in ("MEDIUM", "HIGH") and \
         listrik_cat in ("LOW", "VERY_LOW"):
        dominant_factor = "Pengembangan Infrastruktur & Konektivitas"
        policies.extend([
            {
                "direction": "Perluasan Infrastruktur",
                "rationale": "Infrastruktur yang kurang memadai menjadi hambatan utama masuknya investasi meskipun SDM cukup berkualitas.",
                "actions": [
                    "Percepatan elektrifikasi dan akses energi terbarukan",
                    "Pembangunan infrastruktur transportasi dan logistik",
                    "Pengembangan jaringan telekomunikasi broadband",
                ],
            },
            {
                "direction": "Peningkatan Konektivitas & Logistik",
                "rationale": "Konektivitas yang baik akan menurunkan biaya logistik dan meningkatkan daya tarik investasi.",
                "actions": [
                    "Modernisasi pelabuhan dan bandara regional",
                    "Pembangunan kawasan ekonomi khusus terintegrasi logistik",
                    "Pengembangan transportasi multimoda",
                ],
            },
        ])

    # ── Rule 5: Investment HIGH + stable welfare ──
    elif invest_level in ("HIGH", "VERY_HIGH") and \
         ipm_cat in ("MEDIUM", "HIGH", "VERY_HIGH") and \
         kemiskinan_cat in ("LOW", "VERY_LOW", "MEDIUM"):
        dominant_factor = "Akselerasi & Keberlanjutan"
        policies.extend([
            {
                "direction": "Hilirisasi & Peningkatan Nilai Tambah",
                "rationale": "Investasi tinggi dengan kesejahteraan memadai memberi peluang untuk upgrading ke industri bernilai tambah tinggi.",
                "actions": [
                    "Pengembangan industri hilir berbasis sumber daya lokal",
                    "Penguatan ekosistem inovasi dan riset terapan",
                    "Kerjasama internasional untuk transfer teknologi",
                ],
            },
            {
                "direction": "Pemerataan Regional (Spillover Effect)",
                "rationale": "Wilayah dengan investasi tinggi berpotensi menjadi pusat pertumbuhan yang mendorong wilayah sekitarnya.",
                "actions": [
                    "Program kemitraan antar-daerah untuk transfer kapasitas",
                    "Pengembangan koridor ekonomi yang menghubungkan wilayah maju dan tertinggal",
                    "Insentif bagi investor yang berekspansi ke wilayah tertinggal",
                ],
            },
            {
                "direction": "Keberlanjutan Lingkungan",
                "rationale": "Investasi tinggi memerlukan keseimbangan dengan kelestarian lingkungan.",
                "actions": [
                    "Penerapan standar ESG (Environmental, Social, Governance) bagi investor",
                    "Pengembangan green industry dan energi bersih",
                    "Program pengelolaan limbah industri terpadu",
                ],
            },
        ])

    # ── Rule 6: Very Low IPM + Very High Kemiskinan + Very Low Listrik ──
    elif ipm_cat in ("VERY_LOW",) and \
         kemiskinan_cat in ("VERY_HIGH",) and \
         listrik_cat in ("LOW", "VERY_LOW"):
        dominant_factor = "Intervensi Darurat Layanan Dasar"
        policies.extend([
            {
                "direction": "Layanan Dasar Darurat",
                "rationale": "Profil statistik menunjukkan kondisi kritis: IPM sangat rendah, kemiskinan sangat tinggi, dan infrastruktur dasar minim.",
                "actions": [
                    "Program elektrifikasi prioritas nasional",
                    "Pembangunan sarana pendidikan dan kesehatan darurat",
                    "Program bantuan sosial langsung untuk masyarakat miskin",
                ],
            },
            {
                "direction": "Pemberdayaan Ekonomi Masyarakat",
                "rationale": "Diperlukan pendekatan bottom-up untuk membangun fondasi ekonomi sebelum investasi skala besar dapat masuk.",
                "actions": [
                    "Pengembangan ekonomi berbasis masyarakat dan kearifan lokal",
                    "Pembentukan koperasi dan kelompok usaha produktif",
                    "Program pendampingan usaha mikro dan akses kredit mikro",
                ],
            },
            {
                "direction": "Optimalisasi Dana Otonomi Daerah",
                "rationale": "Dana otonomi khusus dan dana desa perlu dioptimalkan untuk pembangunan infrastruktur dasar.",
                "actions": [
                    "Audit dan restrukturisasi alokasi dana otonomi khusus",
                    "Penguatan kapasitas aparatur daerah dalam pengelolaan anggaran",
                    "Skema pendanaan khusus untuk proyek infrastruktur dasar",
                ],
            },
        ])

    # ── Rule 7: Investment LOW + Kemiskinan HIGH (any IPM) ──
    # Covers clusters with low investment AND high poverty but IPM not necessarily low
    elif invest_level in ("LOW", "VERY_LOW") and \
         kemiskinan_cat in ("HIGH", "VERY_HIGH"):
        dominant_factor = "Pengentasan Kemiskinan & Stimulus Investasi"
        policies.extend([
            {
                "direction": "Program Pengentasan Kemiskinan Terintegrasi",
                "rationale": "Kemiskinan tinggi dengan investasi rendah menciptakan lingkaran setan: kemiskinan menghambat investasi, kurangnya investasi memperparah kemiskinan.",
                "actions": [
                    "Program bantuan sosial produktif berbasis data (PKH, BPNT) yang ditingkatkan",
                    "Pengembangan BUMDes dan koperasi sebagai penggerak ekonomi lokal",
                    "Program pemberdayaan masyarakat miskin melalui pelatihan keterampilan usaha",
                ],
            },
            {
                "direction": "Stimulus Investasi untuk Penciptaan Lapangan Kerja",
                "rationale": "Investasi baru diperlukan untuk membuka lapangan kerja dan menurunkan angka kemiskinan secara struktural.",
                "actions": [
                    "Insentif fiskal bagi investor yang membuka usaha di wilayah dengan kemiskinan tinggi",
                    "Pengembangan kawasan industri kecil dan menengah berbasis potensi lokal",
                    "Program kemitraan UMKM dengan perusahaan besar untuk akses pasar",
                ],
            },
            {
                "direction": "Penguatan Jaring Pengaman Sosial",
                "rationale": "Selama investasi belum tumbuh signifikan, jaring pengaman sosial harus diperkuat untuk mencegah kemiskinan ekstrem.",
                "actions": [
                    "Perluasan cakupan jaminan sosial (kesehatan, ketenagakerjaan)",
                    "Program pangan murah dan subsidi kebutuhan pokok",
                    "Fasilitasi akses permodalan mikro dengan bunga rendah",
                ],
            },
        ])

    # ── Rule 8: Investment LOW + IPM MEDIUM+ + Kemiskinan reasonable ──
    # Covers clusters with low investment but decent human development and welfare
    elif invest_level in ("LOW", "VERY_LOW") and \
         ipm_cat in ("MEDIUM", "HIGH", "VERY_HIGH") and \
         kemiskinan_cat in ("LOW", "VERY_LOW", "MEDIUM"):
        dominant_factor = "Peningkatan Iklim & Daya Tarik Investasi"
        policies.extend([
            {
                "direction": "Reformasi Iklim Investasi",
                "rationale": "SDM dan kesejahteraan memadai namun investasi rendah menunjukkan adanya hambatan struktural bagi masuknya investasi.",
                "actions": [
                    "Penyederhanaan birokrasi perizinan melalui OSS (Online Single Submission)",
                    "Perbaikan regulasi daerah yang menghambat investasi",
                    "Penguatan kepastian hukum dan perlindungan hak investor",
                ],
            },
            {
                "direction": "Promosi Potensi Investasi Daerah",
                "rationale": "Potensi SDM yang baik dan stabilitas sosial merupakan keunggulan kompetitif yang perlu dipromosikan kepada investor.",
                "actions": [
                    "Penyusunan profil investasi daerah berbasis data dan keunggulan komparatif",
                    "Partisipasi aktif dalam forum investasi nasional dan internasional",
                    "Pengembangan platform digital promosi investasi daerah",
                ],
            },
            {
                "direction": "Pengembangan Infrastruktur Pendukung Investasi",
                "rationale": "Infrastruktur yang memadai akan menurunkan biaya operasional dan meningkatkan daya tarik bagi investor.",
                "actions": [
                    "Pembangunan kawasan industri dan zona ekonomi khusus",
                    "Pengembangan infrastruktur digital (broadband, data center)",
                    "Peningkatan konektivitas transportasi antar-wilayah",
                ],
            },
        ])

    # ── Fallback: Identify worst variable and target it ──
    if not policies:
        dominant_factor = "Intervensi Defisit Terbesar"
        # Find variable with worst ratio
        worst_var = None
        worst_score = float("-inf")
        for var, info in characteristics.items():
            is_inv = var in INVERSE_INDICATORS
            ratio = info["ratio"]
            # Normalize: for inverse, high ratio = bad, for normal low ratio = bad
            score = ratio if is_inv else (1.0 / ratio if ratio > 0 else float("inf"))
            if score > worst_score or worst_var is None:
                worst_score = score
                worst_var = var

        if worst_var is None:
            worst_var = "pmdn_rp"

        label = VARIABLE_LABELS.get(worst_var, worst_var)
        policies.append({
            "direction": f"Intervensi Prioritas: {label}",
            "rationale": f"Variabel '{label}' menunjukkan deviasi terbesar dari rata-rata nasional dan memerlukan intervensi prioritas.",
            "actions": [
                f"Analisis mendalam penyebab rendahnya {label} di klaster ini",
                f"Program intervensi khusus untuk meningkatkan {label}",
                "Monitoring dan evaluasi berkala untuk mengukur progres",
            ],
        })

    # ── Additional policy for investment composition ──
    pmdn_cat = cats.get("pmdn_rp", "MEDIUM")
    fdi_cat = cats.get("fdi_rp", "MEDIUM")
    if pmdn_cat in ("HIGH", "VERY_HIGH") and fdi_cat in ("LOW", "VERY_LOW"):
        policies.append({
            "direction": "Peningkatan Daya Tarik Investasi Asing",
            "rationale": "PMDN tinggi namun PMA rendah mengindikasikan hambatan bagi investor asing yang perlu diatasi.",
            "actions": [
                "Penyederhanaan regulasi dan perizinan bagi investor asing",
                "Promosi investasi internasional berbasis keunggulan wilayah",
                "Peningkatan infrastruktur pendukung standar internasional",
            ],
        })
    elif fdi_cat in ("HIGH", "VERY_HIGH") and pmdn_cat in ("LOW", "VERY_LOW"):
        policies.append({
            "direction": "Penguatan Investasi Domestik",
            "rationale": "PMA tinggi namun PMDN rendah menunjukkan perlunya penguatan kapasitas investor lokal.",
            "actions": [
                "Program pemberdayaan pengusaha lokal sebagai mitra investasi",
                "Skema pembiayaan khusus untuk UMKM dan investor domestik",
                "Pengembangan rantai pasok lokal untuk mendukung industri PMA",
            ],
        })

    return policies, dominant_factor


# ─── Main Function ────────────────────────────────────────────────────

def generate_policy_recommendations() -> dict:
    """Generate data-driven policy recommendations from the latest analysis.

    Returns a dict with:
        - national_average: mean values across all provinces
        - pca_interpretation: dominant PCA factors
        - cluster_policies: list of per-cluster policy objects
    """
    result = get_latest_result()
    if result is None:
        raise ValueError("Belum ada analisis yang dijalankan. Jalankan analisis terlebih dahulu.")

    df, _ = _load_dataframe(result.dataset_id)
    numeric_cols = Province.NUMERIC_COLUMNS

    # ── National averages ──
    national_avg = {col: float(df[col].mean()) for col in numeric_cols}

    # ── PCA interpretation ──
    pca_interpretation = _interpret_pca_loadings(result.pca_loadings or {})

    # ── Cluster policies ──
    cluster_policies = []
    cluster_summary = result.cluster_summary or []

    for cluster_item in cluster_summary:
        cluster_id = cluster_item["cluster"]
        label = cluster_item.get("label", f"Klaster {cluster_id}")
        provinces = cluster_item.get("provinces", [])
        stats = cluster_item.get("statistics", {})

        # Step 1: Classify each variable relative to national average
        characteristics = {}
        for var in numeric_cols:
            cluster_mean = stats.get(var, {}).get("mean", 0.0)
            nat_mean = national_avg.get(var, 1.0)
            if nat_mean == 0:
                nat_mean = 1e-10  # avoid division by zero

            ratio = cluster_mean / nat_mean
            is_inverse = var in INVERSE_INDICATORS
            category = _classify_ratio(ratio, is_inverse)
            condition = _classify_condition(ratio, is_inverse)

            characteristics[var] = {
                "label": VARIABLE_LABELS.get(var, var),
                "cluster_mean": round(cluster_mean, 2),
                "national_mean": round(nat_mean, 2),
                "ratio": round(ratio, 4),
                "category": category,
                "condition": condition,
            }

        # Step 3: Generate policy directions
        policies, dominant_factor = _generate_policy_directions(characteristics)

        # Step 4: Build policy rationale
        high_vars = [
            characteristics[v]["label"]
            for v in numeric_cols
            if characteristics[v]["category"] in ("HIGH", "VERY_HIGH")
            and v not in INVERSE_INDICATORS
        ]
        low_vars = [
            characteristics[v]["label"]
            for v in numeric_cols
            if characteristics[v]["category"] in ("LOW", "VERY_LOW")
            and v not in INVERSE_INDICATORS
        ]
        bad_inverse = [
            characteristics[v]["label"]
            for v in numeric_cols
            if v in INVERSE_INDICATORS
            and characteristics[v]["category"] in ("HIGH", "VERY_HIGH")
        ]

        summary_parts = []
        if high_vars:
            summary_parts.append(f"di atas rata-rata nasional pada {', '.join(high_vars)}")
        if low_vars:
            summary_parts.append(f"di bawah rata-rata nasional pada {', '.join(low_vars)}")
        if bad_inverse:
            summary_parts.append(f"memiliki {', '.join(bad_inverse)} yang relatif tinggi")

        rationale = (
            f"Klaster '{label}' ({len(provinces)} provinsi) "
            + ("; ".join(summary_parts) if summary_parts else "berada di sekitar rata-rata nasional")
            + ". "
            + f"Faktor dominan: {dominant_factor}."
        )

        cluster_policies.append({
            "cluster_id": cluster_id,
            "label": label,
            "count": len(provinces),
            "provinces": provinces,
            "characteristics": characteristics,
            "dominant_factor": dominant_factor,
            "policy_directions": policies,
            "policy_rationale": rationale,
        })

    return {
        "national_average": {
            var: {
                "label": VARIABLE_LABELS.get(var, var),
                "value": round(national_avg[var], 2),
            }
            for var in numeric_cols
        },
        "pca_interpretation": pca_interpretation,
        "cluster_policies": cluster_policies,
        "metadata": {
            "k": result.k,
            "dataset_id": result.dataset.id if result.dataset else None,
            "dataset_code": result.dataset.code if result.dataset else None,
            "analysis_id": result.id,
            "analysis_code": result.code,
            "log_transformed": result.log_transformed,
        },
    }
