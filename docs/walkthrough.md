# INVESTRA GOVERMENT — Dokumentasi UML

---

## 1. Arsitektur Sistem

> **Keterangan:** Arsitektur sistem terdiri dari 4 layer. **Client** mengakses sistem melalui browser. **Frontend** (React SPA, port 3000) menangani routing, state management (Zustand + sessionStorage), dan UI (Radix UI + Recharts). **Backend** (Flask API, port 5000) mengelola middleware keamanan (JWT, RBAC, Rate Limiter, CORS), controller, dan service analisis. **Data Layer** menggunakan PostgreSQL 16 untuk penyimpanan dan Redis 7 untuk rate limiting.

```mermaid
graph LR
    subgraph CLIENT["🌐 Client"]
        BR["Browser"]
    end
    subgraph FE["Frontend — React :3000"]
        direction TB
        ROUTER["React Router v7"]
        UI["Radix UI + Recharts"]
        ZUSTAND["Zustand Store"]
    end
    subgraph BE["Backend — Flask :5000"]
        direction TB
        MW["Middleware\nJWT | RBAC | Rate Limiter"]
        CTRL["Controllers\nAuth | Dataset | Analysis\nDashboard | Users"]
        SVC["Services\nAnalysisService | PolicyService"]
        MDL["Models\nUser | Dataset | Province\nAnalysisResult"]
    end
    subgraph DATA["💾 Data"]
        direction TB
        PG["PostgreSQL 16"]
        RD["Redis 7"]
    end
    BR -->|HTTPS| FE
    FE -->|"REST + JWT"| MW
    MW --> CTRL --> SVC --> MDL
    MDL --> PG
    MW -.-> RD
    style CLIENT fill:#1a1a2e,color:#fff
    style FE fill:#0f3460,color:#fff
    style BE fill:#16213e,color:#fff
    style DATA fill:#533483,color:#fff
```

---

## 2. Use Case Diagram

> **Keterangan:** Use case diagram menampilkan 3 aktor: **User** (akses landing page dan login), **Admin** yang mewarisi User dan memiliki akses ke seluruh fitur analisis data, serta **Superadmin** yang memiliki fitur manajemen sistem. Relasi `<<include>>` menunjukkan use case yang wajib dijalankan (contoh: Jalankan K-Means wajib include Jalankan PCA, yang wajib include Preprocessing Data). Relasi `<<extend>>` menunjukkan fitur opsional (contoh: Tentukan Jumlah Cluster memperluas Jalankan K-Means).

```mermaid
flowchart TB
    actor_u(["👤 User"])
    actor_a(["👤 Admin"])
    actor_s(["👤 Superadmin"])

    actor_a -.->|inherits| actor_u
    actor_s -.->|inherits| actor_a

    subgraph SYSTEM["Investment Inequality Dashboard System"]
        UC_LOGIN(["Login"])
        UC_LANDING(["Akses Landing Page"])
        UC_LOGOUT(["Logout"])
        UC_UPLOAD(["Upload Dataset"])
        UC_VALIDASI(["Validasi Dataset"])
        UC_PREPROCESS(["Preprocessing Data"])
        UC_PCA(["Jalankan PCA"])
        UC_KMEANS(["Jalankan K-Means"])
        UC_CLUSTER(["Tentukan Jumlah Cluster"])
        UC_HASIL(["Lihat Hasil Analisis"])
        UC_VIS(["Lihat Visualisasi"])
        UC_PANDUAN(["Lihat Panduan Dataset"])
        UC_EKSPOR(["Ekspor Hasil"])
        UC_ABOUT(["Lihat About dan Metodologi"])
        UC_POLICY(["Lihat Rekomendasi Kebijakan"])
        UC_MANSYS(["Manajemen Sistem"])
        UC_MANUSER(["Manajemen User"])
    end

    actor_u --- UC_LOGIN
    actor_u --- UC_LANDING

    actor_a --- UC_LOGOUT
    actor_a --- UC_UPLOAD
    actor_a --- UC_HASIL
    actor_a --- UC_VIS
    actor_a --- UC_PANDUAN
    actor_a --- UC_EKSPOR
    actor_a --- UC_ABOUT
    actor_a --- UC_POLICY

    actor_s --- UC_MANSYS

    UC_UPLOAD -.->|"≪include≫"| UC_VALIDASI
    UC_VALIDASI -.->|"≪include≫"| UC_LOGIN
    UC_HASIL -.->|"≪include≫"| UC_KMEANS
    UC_KMEANS -.->|"≪include≫"| UC_PCA
    UC_PCA -.->|"≪include≫"| UC_PREPROCESS
    UC_MANSYS -.->|"≪include≫"| UC_MANUSER

    UC_CLUSTER -.->|"≪extend≫"| UC_KMEANS
    UC_VIS -.->|"≪extend≫"| UC_HASIL
    UC_EKSPOR -.->|"≪extend≫"| UC_PANDUAN
    UC_LOGOUT -.->|"≪extend≫"| UC_LOGIN

    style actor_u fill:#3498db,color:#fff,stroke:#2980b9
    style actor_a fill:#f39c12,color:#fff,stroke:#e67e22
    style actor_s fill:#e74c3c,color:#fff,stroke:#c0392b
    style SYSTEM fill:#f8f9fa,color:#000,stroke:#adb5bd
```

---

## 3. Activity Diagram

### 3.1 Login

_Ref: Use Case — Login_

> **Keterangan:** User menginput kredensial, sistem memvalidasi username dan password terhadap database. Jika valid, dicek status akun aktif. Token JWT (HS256, 12 jam) di-generate dan disimpan ke Zustand Store + sessionStorage. Terdapat 2 titik kegagalan: kredensial salah (dapat diulang) dan akun nonaktif (berhenti).

```mermaid
flowchart TD
    S((●)) --> A["Input username\ndan password"]
    A --> B["POST /api/auth/login"]
    B --> C{"Kredensial\nvalid?"}
    C -- Tidak --> A
    C -- Ya --> D{"Akun aktif?"}
    D -- Tidak --> E1((✕))
    D -- Ya --> F["Generate JWT\nHS256 exp 12 jam"]
    F --> G["Simpan ke Zustand\n+ sessionStorage"]
    G --> H["Redirect /dashboard"]
    H --> E2((●))
    style S fill:#27ae60,color:#fff
    style E1 fill:#e74c3c,color:#fff
    style E2 fill:#27ae60,color:#fff
    style C fill:#f39c12,color:#000
    style D fill:#f39c12,color:#000
```

### 3.2 Upload Dataset

_Ref: Use Case — Upload Dataset `<<include>>` Validasi Dataset_

> **Keterangan:** Admin memilih file CSV lalu mengirimkan ke API. Proses **Validasi Dataset** (`<<include>>`) dilakukan dengan 3 tahap: otorisasi JWT + role, kelengkapan kolom wajib (provinsi, pmdn_rp, fdi_rp, ipm, kemiskinan, pdrb, tpt, akses_listrik), dan deteksi duplikasi melalui checksum SHA-256. Jika lolos, sistem membuat versi baru, menonaktifkan versi lama, meng-insert data provinsi, dan mengaktifkan dataset baru.

```mermaid
flowchart TD
    S((●)) --> A["Admin pilih file CSV"]
    A --> B["POST /api/dataset/upload"]
    B --> C{"Auth + role\nvalid?"}
    C -- Tidak --> E1((✕))
    C -- Ya --> VAL["≪include≫\nValidasi Dataset"]

    subgraph VALIDASI["Validasi Dataset"]
        direction TB
        V1{"Kolom wajib\nlengkap?"}
        V1 -- Tidak --> V_ERR((✕))
        V1 -- Ya --> V2["Hitung SHA-256"]
        V2 --> V3{"Checksum\nduplikat?"}
        V3 -- Ya --> V_DUP((✕))
    end

    VAL --> V1
    V3 -- Tidak --> H["Buat Dataset\nversi baru"]
    H --> I["Insert baris\nProvince"]
    I --> J["Aktifkan\ndataset baru"]
    J --> E2((●))

    style S fill:#27ae60,color:#fff
    style E1 fill:#e74c3c,color:#fff
    style V_ERR fill:#e74c3c,color:#fff
    style V_DUP fill:#e74c3c,color:#fff
    style E2 fill:#27ae60,color:#fff
    style C fill:#f39c12,color:#000
    style V1 fill:#f39c12,color:#000
    style V3 fill:#f39c12,color:#000
    style VAL fill:#fff3cd,color:#000,stroke:#ffc107
```

### 3.3 Lihat Hasil Analisis

_Ref: Use Case — Lihat Hasil Analisis `<<include>>` Jalankan K-Means `<<include>>` Jalankan PCA `<<include>>` Preprocessing Data_

> **Keterangan:** Ini adalah alur inti sistem yang mencakup pipeline lengkap. Admin menentukan parameter, sistem memuat data, lalu secara berurutan menjalankan **Preprocessing** (log-transform + StandardScaler), **PCA** (reduksi dimensi), dan **K-Means** (Consensus 25 runs × n_init=50). Hasil evaluasi (Silhouette, Inertia, Davies-Bouldin, Calinski-Harabasz) disimpan ke database, lalu ditampilkan kepada admin.

```mermaid
flowchart TD
    S((●)) --> A["Set parameter\nk, mode, tahun"]
    A --> B{"Auth valid?"}
    B -- Tidak --> E1((✕))
    B -- Ya --> C{"Dataset\naktif ada?"}
    C -- Tidak --> E2((✕))
    C -- Ya --> D["Load data provinsi"]

    subgraph PREP["≪include≫ Preprocessing Data"]
        P1["Log-transform"]
        P2["StandardScaler"]
        P1 --> P2
    end

    subgraph PCA_S["≪include≫ Jalankan PCA"]
        PC1["PCA fit"]
        PC2["Extract komponen\n+ loadings"]
        PC1 --> PC2
    end

    subgraph KM_S["≪include≫ Jalankan K-Means"]
        KM1["Consensus K-Means\n25 runs × n_init=50"]
        KM2["Hitung 4 metrik\nevaluasi"]
        KM1 --> KM2
    end

    D --> P1
    P2 --> PC1
    PC2 --> KM1

    KM2 --> SAVE["Simpan\nAnalysisResult"]
    SAVE --> SHOW["Tampilkan\nhasil analisis"]
    SHOW --> E3((●))

    style S fill:#27ae60,color:#fff
    style E1 fill:#e74c3c,color:#fff
    style E2 fill:#e74c3c,color:#fff
    style E3 fill:#27ae60,color:#fff
    style B fill:#f39c12,color:#000
    style C fill:#f39c12,color:#000
    style PREP fill:#e8f5e9,color:#000,stroke:#4caf50
    style PCA_S fill:#e3f2fd,color:#000,stroke:#2196f3
    style KM_S fill:#fff3e0,color:#000,stroke:#ff9800
```

### 3.4 Lihat Rekomendasi Kebijakan

_Ref: Use Case — Lihat Rekomendasi Kebijakan_

> **Keterangan:** Sistem mengambil hasil analisis terakhir, menghitung **rata-rata nasional** per indikator, membandingkan tiap cluster dengan rasio terhadap nilai nasional. Rasio diklasifikasikan ke 5 level (Sangat Rendah–Sangat Tinggi). Selanjutnya dilakukan interpretasi PCA loadings dan **rule engine** menghasilkan arah kebijakan spesifik per cluster.

```mermaid
flowchart TD
    S((●)) --> A["GET /api/analysis/policy"]
    A --> B{"Auth valid?"}
    B -- Tidak --> E1((✕))
    B -- Ya --> C{"Ada hasil\nanalisis?"}
    C -- Tidak --> E2((✕))
    C -- Ya --> D["Hitung rata-rata\nnasional"]
    D --> F["Rasio cluster\nvs nasional"]
    F --> G["Klasifikasi\nkondisi 5 level"]
    G --> H["Interpretasi\nPCA loadings"]
    H --> I["Generate kebijakan\nper cluster"]
    I --> E3((●))
    style S fill:#27ae60,color:#fff
    style E1 fill:#e74c3c,color:#fff
    style E2 fill:#e74c3c,color:#fff
    style E3 fill:#27ae60,color:#fff
    style B fill:#f39c12,color:#000
    style C fill:#f39c12,color:#000
```

### 3.5 Manajemen User

_Ref: Use Case — Manajemen Sistem `<<include>>` Manajemen User_

> **Keterangan:** Superadmin dapat melakukan 3 aksi: **Create** (validasi password strength, cek duplikat username/email, generate UUID, hash password), **Update** (proteksi: tidak bisa downgrade/nonaktifkan last superadmin), dan **Delete** (proteksi: tidak bisa hapus last active superadmin). Setiap aksi memerlukan autentikasi dan role superadmin.

```mermaid
flowchart TD
    S((●)) --> AUTH{"Auth valid?\nRole superadmin?"}
    AUTH -- Tidak --> E1((✕))
    AUTH -- Ya --> ACTION{"Pilih aksi"}

    ACTION -- Create --> CR1["Isi data user"]
    CR1 --> CR2{"Password kuat?\nData valid?"}
    CR2 -- Tidak --> E2((✕))
    CR2 -- Ya --> CR3["Hash password\nSimpan user"]
    CR3 --> E3((●))

    ACTION -- Update --> UP1["Cari user"]
    UP1 --> UP2{"Ditemukan?"}
    UP2 -- Tidak --> E4((✕))
    UP2 -- Ya --> UP3{"Last\nsuperadmin?"}
    UP3 -- Ya, downgrade --> E5((✕))
    UP3 -- Tidak --> UP4["Update fields"]
    UP4 --> E6((●))

    ACTION -- Delete --> DL1["Cari user"]
    DL1 --> DL2{"Last active\nsuperadmin?"}
    DL2 -- Ya --> E7((✕))
    DL2 -- Tidak --> DL3["Hapus user"]
    DL3 --> E8((●))

    style S fill:#27ae60,color:#fff
    style AUTH fill:#f39c12,color:#000
    style ACTION fill:#3498db,color:#fff
    style CR2 fill:#f39c12,color:#000
    style UP2 fill:#f39c12,color:#000
    style UP3 fill:#f39c12,color:#000
    style DL2 fill:#f39c12,color:#000
    style E1 fill:#e74c3c,color:#fff
    style E2 fill:#e74c3c,color:#fff
    style E3 fill:#27ae60,color:#fff
    style E4 fill:#e74c3c,color:#fff
    style E5 fill:#e74c3c,color:#fff
    style E6 fill:#27ae60,color:#fff
    style E7 fill:#e74c3c,color:#fff
    style E8 fill:#27ae60,color:#fff
```

---

## 4. Sequence Diagram

### 4.1 Login

_Ref: Use Case — Login_

> **Keterangan:** User mengirim kredensial ke Frontend → POST ke Flask API → query PostgreSQL → verify password hash → generate JWT → simpan ke Zustand + sessionStorage → redirect. Pada akses berikutnya, token dikirim sebagai Bearer header untuk validasi di Middleware.

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend
    participant ZS as Zustand Store
    participant MW as JWT Middleware
    participant API as Flask API
    participant DB as PostgreSQL

    rect rgb(40, 40, 60)
    Note over User,DB: Login Flow
    User->>FE: Input username & password
    FE->>API: POST /api/auth/login
    API->>DB: Query user by username
    DB-->>API: User row
    API->>API: Verify password hash
    API->>API: Generate JWT HS256
    API-->>FE: {user, token}
    FE->>ZS: setAuth(user, token)
    ZS->>ZS: Persist ke sessionStorage
    FE-->>User: Redirect /dashboard
    end

    rect rgb(40, 60, 40)
    Note over User,DB: Protected Request
    User->>FE: Akses halaman terproteksi
    FE->>ZS: getToken()
    ZS-->>FE: JWT token
    FE->>MW: Request + Bearer token
    MW->>MW: Decode & validate JWT
    MW->>DB: Lookup user by id
    DB-->>MW: User row
    MW->>MW: Check is_active & role
    MW->>API: Forward request
    API->>DB: Query data
    DB-->>API: Results
    API-->>FE: JSON response
    FE-->>User: Render halaman
    end
```

### 4.2 Upload Dataset

_Ref: Use Case — Upload Dataset `<<include>>` Validasi Dataset_

> **Keterangan:** Frontend mengirim file CSV multipart ke DatasetController. Controller menjalankan proses **Validasi Dataset** secara internal: parsing CSV, validasi kolom wajib, penghitungan checksum SHA-256, dan pengecekan duplikasi. Jika valid, dilakukan pembuatan versi baru, deaktivasi dataset lama, loop insert provinsi, dan aktivasi dataset baru.

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant CTRL as DatasetController
    participant DB as PostgreSQL

    Admin->>FE: Pilih file CSV
    FE->>CTRL: POST /api/dataset/upload (multipart)

    rect rgb(60, 50, 40)
    Note over CTRL: ≪include≫ Validasi Dataset
    CTRL->>CTRL: Parse CSV content
    CTRL->>CTRL: Validate required columns
    CTRL->>CTRL: Compute SHA-256 checksum
    CTRL->>DB: Check duplicate checksum
    DB-->>CTRL: Not found
    end

    CTRL->>DB: INSERT new dataset (version+1)
    CTRL->>DB: Deactivate old dataset

    loop Setiap baris CSV
        CTRL->>DB: INSERT INTO provinces
    end

    CTRL->>DB: Activate new dataset
    CTRL-->>FE: {metadata, row_count}
    FE-->>Admin: Notifikasi sukses
```

### 4.3 Lihat Hasil Analisis

_Ref: Use Case — Lihat Hasil Analisis `<<include>>` K-Means `<<include>>` PCA `<<include>>` Preprocessing_

> **Keterangan:** Pipeline lengkap melalui 4 fase include. (1) **Data Loading** — query provinsi dari dataset aktif; (2) **Preprocessing Data** — log-transform dan StandardScaler; (3) **Jalankan PCA** — fitting dan ekstraksi komponen; (4) **Jalankan K-Means** — Consensus 25 runs, alignment, voting, evaluasi. Hasil disimpan dan dikembalikan ke frontend untuk divisualisasikan.

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant CTRL as AnalysisController
    participant SVC as AnalysisService
    participant DB as PostgreSQL

    Admin->>FE: Set parameter k=3, mode, tahun
    FE->>CTRL: POST /api/analysis/run

    rect rgb(40, 40, 60)
    Note over CTRL,DB: Data Loading
    CTRL->>SVC: loadDataframe(mode, years)
    SVC->>DB: SELECT provinces WHERE dataset=active
    DB-->>SVC: Dataset rows
    end

    rect rgb(60, 50, 40)
    Note over SVC: ≪include≫ Preprocessing Data
    SVC->>SVC: Log-transform skewed features
    SVC->>SVC: StandardScaler normalization
    end

    rect rgb(40, 60, 40)
    Note over SVC: ≪include≫ Jalankan PCA
    SVC->>SVC: PCA fit(X_scaled)
    SVC->>SVC: Extract components + loadings
    end

    rect rgb(60, 60, 40)
    Note over SVC: ≪include≫ Jalankan K-Means
    SVC->>SVC: Consensus 25 runs × n_init=50
    SVC->>SVC: Align labels + majority voting
    SVC->>SVC: Calculate 4 evaluation metrics
    end

    SVC->>DB: INSERT INTO analysis_results
    SVC-->>CTRL: PCA + clusters + metrics
    CTRL-->>FE: JSON response
    FE-->>Admin: Render charts (Recharts)
```

### 4.4 Lihat Rekomendasi Kebijakan

_Ref: Use Case — Lihat Rekomendasi Kebijakan_

> **Keterangan:** PolicyService mengambil AnalysisResult terakhir dari database, menghitung rata-rata nasional per indikator, menghitung rasio cluster vs nasional, mengklasifikasikan ke 5 level kondisi, menginterpretasi PCA loadings untuk faktor dominan, lalu rule engine menghasilkan rekomendasi spesifik per cluster.

```mermaid
sequenceDiagram
    actor Admin
    participant FE as Frontend
    participant CTRL as AnalysisController
    participant POL as PolicyService
    participant DB as PostgreSQL

    Admin->>FE: Buka halaman kebijakan
    FE->>CTRL: GET /api/analysis/policy
    CTRL->>POL: generateRecommendations()
    POL->>DB: Get latest AnalysisResult
    DB-->>POL: Analysis data + provinces
    POL->>POL: Calculate national averages
    POL->>POL: Compute cluster vs national ratios
    POL->>POL: Classify conditions (5 levels)
    POL->>POL: Interpret PCA loadings
    POL->>POL: Generate policy directions
    POL-->>CTRL: Recommendations per cluster
    CTRL-->>FE: JSON response
    FE-->>Admin: Render kartu kebijakan
```

### 4.5 Manajemen User

_Ref: Use Case — Manajemen Sistem `<<include>>` Manajemen User_

> **Keterangan:** Superadmin melakukan operasi CRUD user melalui UserController. Pada **Create**: validasi field + password strength, cek duplikat, hash password, generate UUID/code, simpan. Pada **Update**: cari user, cek proteksi last superadmin. Pada **Delete**: cari user, cek last active superadmin, hapus. Setiap operasi memerlukan autentikasi JWT dan role superadmin.

```mermaid
sequenceDiagram
    actor SA as Superadmin
    participant FE as Frontend
    participant CTRL as UserController
    participant DB as PostgreSQL

    SA->>FE: Kelola user

    rect rgb(40, 40, 60)
    Note over SA,DB: Create User
    SA->>FE: Isi form user baru
    FE->>CTRL: POST /api/users
    CTRL->>CTRL: Validate + check duplicate
    CTRL->>CTRL: Hash password
    CTRL->>DB: INSERT INTO users
    DB-->>CTRL: User created
    CTRL-->>FE: 201 Created
    end

    rect rgb(40, 60, 40)
    Note over SA,DB: Update User
    SA->>FE: Edit data user
    FE->>CTRL: PUT /api/users/:id
    CTRL->>DB: Find user by id
    DB-->>CTRL: User row
    CTRL->>CTRL: Check last superadmin protection
    CTRL->>DB: UPDATE user
    CTRL-->>FE: 200 Updated
    end

    rect rgb(60, 40, 40)
    Note over SA,DB: Delete User
    SA->>FE: Hapus user
    FE->>CTRL: DELETE /api/users/:id
    CTRL->>DB: Find user by id
    DB-->>CTRL: User row
    CTRL->>CTRL: Check last superadmin protection
    CTRL->>DB: DELETE FROM users
    CTRL-->>FE: 200 Deleted
    end
```

---

## 5. Class Diagram

> **Keterangan:** Backend terdiri dari **4 model** ORM: User (auth + role hierarchy user→admin→superadmin), Dataset (versioning + checksum SHA-256), Province (7 indikator sosial-ekonomi per provinsi per tahun), AnalysisResult (output PCA + K-Means dalam JSON). **2 service**: AnalysisService (pipeline analisis) dan PolicyService (generator rekomendasi). Relasi: User uploads Dataset, Dataset contains Province dan produces AnalysisResult.

```mermaid
classDiagram
    direction LR
    class User {
        +id UUID PK
        +username Unique
        +email Unique
        +password_hash
        +role user|admin|superadmin
        +is_active Boolean
        +checkPassword() Boolean
        +hasRole() Boolean
    }
    class Dataset {
        +id UUID PK
        +code Unique
        +version Integer
        +is_active Boolean
        +checksum SHA256
        +row_count Integer
        +getActive() Dataset
    }
    class Province {
        +id UUID PK
        +dataset_id FK
        +provinsi String
        +pmdn_rp Float
        +fdi_rp Float
        +ipm Float
        +kemiskinan Float
        +pdrb_per_kapita Float
        +tpt Float
        +akses_listrik Float
        +year Integer
    }
    class AnalysisResult {
        +id UUID PK
        +dataset_id FK
        +k Integer
        +pca_components JSON
        +pca_loadings JSON
        +cluster_assignments JSON
        +silhouette_score Float
        +davies_bouldin Float
        +calinski_harabasz Float
    }
    class AnalysisService {
        +runFullAnalysis()
        +evaluateKRange()
    }
    class PolicyService {
        +generateRecommendations()
    }
    User "1" --> "*" Dataset : uploads
    Dataset "1" --> "*" Province : contains
    Dataset "1" --> "*" AnalysisResult : produces
    AnalysisService ..> Province
    AnalysisService ..> AnalysisResult
    PolicyService ..> AnalysisResult
```

---

## 6. Database Diagram (ERD)

> **Keterangan:** 4 tabel PostgreSQL 16. **users** menyimpan autentikasi (4 UNIQUE, role CHECK). **datasets** mengelola versioning + checksum (FK→users SET NULL). **provinces** menyimpan 7 indikator per provinsi per tahun (6 CHECK, FK→datasets CASCADE). **analysis_results** menyimpan output PCA + K-Means dalam JSON (FK→datasets CASCADE).

```mermaid
erDiagram
    users {
        varchar36 id PK "UUID"
        varchar32 code UK
        varchar80 username UK
        varchar150 email UK
        varchar256 password_hash
        varchar150 full_name
        varchar20 role "user|admin|superadmin"
        boolean is_active
        datetime created_at
        datetime updated_at
    }
    datasets {
        varchar36 id PK "UUID"
        varchar32 code UK
        integer version UK
        varchar200 name
        text description
        integer year
        boolean is_active
        varchar36 uploaded_by FK
        datetime created_at
        varchar64 checksum UK "SHA-256"
        integer row_count
    }
    provinces {
        varchar36 id PK "UUID"
        varchar32 code UK
        varchar36 dataset_id FK "CASCADE"
        varchar100 provinsi
        float pmdn_rp
        float fdi_rp
        float pdrb_per_kapita
        float ipm "0-100"
        float kemiskinan "0-100"
        float akses_listrik "0-100"
        float tpt "0-100"
        integer year
    }
    analysis_results {
        varchar36 id PK "UUID"
        varchar32 code UK
        varchar36 dataset_id FK "CASCADE"
        datetime created_at
        integer k "2-10"
        json pca_components
        json pca_loadings
        json pca_explained_variance
        json cluster_assignments
        json cluster_centers
        float silhouette_score
        float inertia
        float davies_bouldin
        float calinski_harabasz
        json cluster_summary
    }
    users ||--o{ datasets : "uploads"
    datasets ||--o{ provinces : "contains"
    datasets ||--o{ analysis_results : "produces"
```
