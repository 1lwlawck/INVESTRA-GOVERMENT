# Git & Development Workflow

## Project Layout

INVESTRA adalah monorepo dengan dua sub-project:

```
investra-government/
├── investra-gov-apps-be/     # Flask API + Postgres + Redis (Dockerized)
└── investra-gov-apps-fe/     # React + Vite (run local: npm run dev)
```

- **Backend** dijalankan via Docker: `cd investra-gov-apps-be && docker compose up -d`
- **Frontend** dijalankan lokal: `cd investra-gov-apps-fe && npm run dev`

> Frontend belum di-deploy. Rencana ke depan: Vercel (preview & production).

---

## Setup pertama kali (per clone)

Setelah clone repo, jalankan sekali:

```bash
# Aktifkan git hooks (lint pre-commit + tests pre-push)
git config core.hooksPath .githooks

# Backend venv + dev deps
cd investra-gov-apps-be
python -m venv .venv
.venv/Scripts/activate          # Windows; Linux/macOS: source .venv/bin/activate
pip install -e ".[dev]"

# Frontend deps
cd ../investra-gov-apps-fe
npm ci
```

Setelah ini, `git commit` otomatis menjalankan **ruff** (BE) + **eslint** (FE) terhadap file yang di-stage, dan `git push` otomatis menjalankan **pytest** (BE) + **vitest + tsc --noEmit** (FE). Detail di [`.githooks/README.md`](.githooks/README.md).

---

## Branch Strategy

```
feat/* / fix/* / chore/*
        │
        ▼ PR (setelah implementasi selesai)
   development  ◄── integration branch
        │
        ▼ PR (setelah testing selesai & siap production)
      main  ◄── production
        │
        ▼ tag vX.Y.Z
   GitHub Release
```

- `main` — production, **jangan push langsung**, selalu via PR
- `development` — semua fitur & fix masuk ke sini dulu sebelum ke `main`
- `feat/*` / `fix/*` / `chore/*` / `refactor/*` / `docs/*` — branch per pekerjaan, branch dari `development`

---

## Branch Naming

Tidak pakai issue tracker sekarang. Gunakan slug deskriptif:

```
{type}/{short-description}

Contoh:
  feat/interactive-map-react-simple-maps
  fix/auth-token-expiry-validation
  chore/setup-pytest-ruff
  refactor/be-snake-case-naming
  docs/update-workflow
```

---

## Alur Kerja Per Tugas

### 1. Mulai pekerjaan
```bash
git checkout development
git pull origin development
git checkout -b feat/nama-fitur
```

### 2. Implementasi
- Kerjakan di branch fitur
- Commit per perubahan logis (atomic commit)

### 3. Verifikasi sebelum PR

**Backend:**
```bash
cd investra-gov-apps-be
.venv/Scripts/activate     # Windows; di Linux/macOS: source .venv/bin/activate
ruff check .
pytest
```

**Frontend:**
```bash
cd investra-gov-apps-fe
npm run build
```

> Jangan buat PR jika lint atau build gagal.

### 4. PR feat → development
```bash
"/c/Program Files/GitHub CLI/gh.exe" pr create \
  --base development \
  --head feat/nama-fitur \
  --title "feat: deskripsi singkat" \
  --body "..."
```

### 5. Merge ke development
Setelah PR di-review, merge ke `development`.

### 6. Testing di development
- Untuk BE: rebuild Docker + run smoke test endpoint kritis
- Untuk FE: `npm run build` dan jalankan preview lokal
- Pastikan tidak ada bug sebelum naik ke `main`

> Setelah Vercel di-setup, branch `development` akan auto-deploy ke preview environment.

### 7. PR development → main
Buat PR ke `main` **hanya setelah testing selesai**:
```bash
"/c/Program Files/GitHub CLI/gh.exe" pr create \
  --base main \
  --head development \
  --title "Release: ringkasan update" \
  --body "..."
```

### 8. Release (setelah merge ke main)

Bump versi di kedua project (kalau perubahannya kena keduanya):

```bash
# BE: edit version di pyproject.toml
# FE: npm version <patch|minor|major>

git add investra-gov-apps-be/pyproject.toml investra-gov-apps-fe/package.json
git commit -m "chore: bump version to vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

---

## Kapan Buat PR?

| Dari → Ke | Kapan |
|---|---|
| `feat/*` / `fix/*` / `chore/*` → `development` | Setelah implementasi selesai & lint + tests pass |
| `development` → `main` | Setelah testing di development selesai & siap production |

> **Jangan buat PR `development → main` sebelum testing.**

---

## Commit Convention

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): deskripsi singkat     # fitur baru
fix(scope): deskripsi singkat      # bug fix
refactor(scope): deskripsi singkat # restruktur kode tanpa ubah behavior
chore(scope): deskripsi singkat    # tooling, config, deps
docs(scope): deskripsi singkat     # dokumentasi
test(scope): deskripsi singkat     # test saja
perf(scope): deskripsi singkat     # performance improvement
```

Scope contoh: `be`, `fe`, `auth`, `dataset`, `analysis`, `dashboard`, `map`, `docker`, `ci`.

Contoh:
```
feat(map): render dashboard map from 38-province GeoJSON
fix(auth): allow refresh after exact token expiry
chore(be): setup pyproject.toml with ruff and pytest
refactor(be): rename PascalCase modules to snake_case
docs: update workflow for INVESTRA project
```

---

## Semantic Versioning

Per project (BE & FE punya version masing-masing).

| Tipe perubahan | Bump | Contoh |
|---|---|---|
| Bug fix tanpa breaking change | `PATCH` | `0.1.0` → `0.1.1` |
| Fitur baru tanpa breaking change | `MINOR` | `0.1.1` → `0.2.0` |
| Breaking change (API contract berubah, dst) | `MAJOR` | `0.x.x` → `1.0.0` |

Tag git mengikuti versi yang paling besar berubah (BE atau FE).

---

## Code Quality Gate

### Backend (`investra-gov-apps-be`)
- **Lint**: `ruff check .` harus pass
- **Format**: `ruff format .` (otomatis)
- **Tests**: `pytest` harus pass (saat ini 21 smoke tests)
- **Build container**: `docker compose build api` harus pass

### Frontend (`investra-gov-apps-fe`)
- **Lint**: `npm run lint` harus pass (ESLint + plugin-react-hooks + Prettier)
- **Format**: `npm run format` (Prettier auto-fix)
- **Typecheck**: `npm run typecheck` (`tsc --noEmit`) harus pass
- **Tests**: `npm test` (Vitest + RTL + jsdom) harus pass (saat ini 9 tests)
- **Build**: `npm run build` (TypeScript + Vite) harus pass

---

## GitHub CLI

GitHub CLI terinstall di `C:/Program Files/GitHub CLI/gh.exe`.

Di bash session:
```bash
"/c/Program Files/GitHub CLI/gh.exe" pr list
"/c/Program Files/GitHub CLI/gh.exe" pr create ...
"/c/Program Files/GitHub CLI/gh.exe" pr merge <number> --merge
"/c/Program Files/GitHub CLI/gh.exe" pr view <number>
```

Repo: <https://github.com/1lwlawck/INVESTRA-GOVERMENT>

---

## TODO (deployment & CI)

Belum di-setup, akan dikerjakan terpisah:

- [ ] Vercel preview untuk branch `development`
- [ ] Vercel production untuk branch `main`
- [ ] Environment variables di Vercel (`VITE_API_URL`)
- [ ] Backend deploy target (saat ini hanya Docker lokal)
- [ ] CI workflow (GitHub Actions): ruff + pytest + npm build
