# Investra Gov Apps - Backend API

Flask REST API for investment inequality analysis using PCA and K-Means clustering on 38 Indonesian provinces.

## Tech Stack

- Python 3.12 / Flask 3.1
- PostgreSQL 16 with SQLAlchemy + Flask-Migrate
- scikit-learn 1.6 (PCA, K-Means, evaluation metrics)
- Docker + Docker Compose

## Quick Start

```bash
# 1. Start everything (PostgreSQL + API)
docker compose up --build -d

# 2. Verify
curl http://localhost:5000/health
```

The API auto-runs migrations and starts Flask on port 5000.

Create superadmin account (first-time setup):

```bash
python GenerateSuperAdmin.py --password "<YOUR_STRONG_PASSWORD>"
```

## API Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| GET | `/health` | Health check + DB status |
| POST | `/api/auth/login` | Login and get access token |
| GET | `/api/auth/me` | Current authenticated user |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/dataset/default` | Active dataset metadata |
| GET | `/api/dataset/default/data` | Paginated province data (`?page=&page_size=`) |
| GET | `/api/dataset/default/sample` | First N rows (`?n=5`) |
| GET | `/api/dashboard/summary` | Aggregate statistics |
| GET | `/api/provinces` | Province list |
| POST | `/api/analysis/run` | Run PCA + K-Means (`{"k": 3}`) |
| GET | `/api/analysis/pca` | PCA results (latest run) |
| GET | `/api/analysis/clusters` | Cluster assignments (latest run) |
| GET | `/api/analysis/evaluate-k` | Elbow method (`?k_min=2&k_max=8`) |
| GET | `/api/analysis/policy` | Policy recommendations |

## Public ID Format

Semua entitas sekarang memakai public ID:

- `id` = UUID (contoh: `4a7d54a1-63b8-4afe-a2a8-8af94ef4ec31`)
- `code` = kode representatif:
  - User: `USR012026`
  - Dataset: `DTS001`
  - Province: `PROV0012026`
  - Analysis: `ANL0012026`

Endpoint path seperti `/users/{id}` dan `/dataset/versions/{id}` menerima `UUID` atau `code`.

## Postman

Import file berikut di Postman:

- `postman/InvestraGovAPI.postman_collection.json`
- `postman/InvestraLocal.postman_environment.json`

## Environment Variables

| Variable | Default |
| -------- | ------- |
| `DATABASE_URL` | empty (recommended build from `POSTGRES_*` vars) |
| `DB_POOL_SIZE` | `10` |
| `DB_MAX_OVERFLOW` | `20` |
| `DB_POOL_TIMEOUT` | `30` |
| `DB_POOL_RECYCLE` | `1800` |
| `DB_STATEMENT_TIMEOUT_MS` | `30000` |
| `DB_LOCK_TIMEOUT_MS` | `5000` |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | `15000` |
| `DB_APPLICATION_NAME` | `investra-api` |
| `FLASK_ENV` | `production` |
| `FLASK_APP` | `Wsgi.py` |
| `SECRET_KEY` | empty (generate a random value) |
| `JWT_EXPIRES_HOURS` | `12` |
| `CORS_ORIGINS` | `http://localhost:3000` |
| `CORS_SUPPORTS_CREDENTIALS` | `false` |
| `MAX_CONTENT_LENGTH` | `10485760` (10MB) |
| `RATELIMIT_STORAGE_URI` | `redis://redis:6379/0` |

## Local Development (without Docker)

```bash
pip install -r requirements.txt
export POSTGRES_USER=investra
export POSTGRES_PASSWORD='<set-your-password>'
export POSTGRES_DB=investra_db
export DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/${POSTGRES_DB}
export FLASK_APP=Wsgi.py
export SECRET_KEY='<generate-random-secret>'

flask db upgrade
python GenerateSuperAdmin.py --password "<YOUR_STRONG_PASSWORD>"
flask run --host=0.0.0.0 --port=5000 --reload
```
