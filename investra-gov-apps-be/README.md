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
python GenerateSuperAdmin.py --password "StrongPass123"
```

## API Endpoints

Dokumentasi lengkap (role, request body, error code, contoh cURL):

- `ApiDocumentation.md`

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

## Postman

Import file berikut di Postman:

- `postman/InvestraGovAPI.postman_collection.json`
- `postman/InvestraLocal.postman_environment.json`

## Environment Variables

| Variable | Default |
| -------- | ------- |
| `DATABASE_URL` | `postgresql://investra:investra_secret@localhost:5432/investra_db` |
| `FLASK_ENV` | `production` |
| `FLASK_APP` | `Wsgi.py` |
| `SECRET_KEY` | `dev-secret` |
| `JWT_EXPIRES_HOURS` | `12` |
| `CORS_ORIGINS` | `http://localhost:3000` |
| `CORS_SUPPORTS_CREDENTIALS` | `false` |
| `MAX_CONTENT_LENGTH` | `10485760` (10MB) |
| `RATELIMIT_STORAGE_URI` | `redis://redis:6379/0` |

## Local Development (without Docker)

```bash
pip install -r requirements.txt
export DATABASE_URL=postgresql://investra:investra_secret@localhost:5432/investra_db
export FLASK_APP=Wsgi.py
export SECRET_KEY=dev-secret

flask db upgrade
python GenerateSuperAdmin.py --password "StrongPass123"
flask run --host=0.0.0.0 --port=5000 --reload
```
