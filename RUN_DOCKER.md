# Run FE + BE With One Command

From repo root (`e:\WORK\REACT\INVESTRA GOVERMENT`):

```bash
docker compose up --build -d
```

Open:

- Frontend: `http://localhost:3000`
- Backend API health: `http://localhost:5000/health`
- Redis rate-limit store: internal only (`redis:6379`, no host port)

Create/update superadmin account:

```bash
docker compose exec api python GenerateSuperAdmin.py
```

With explicit password:

```bash
docker compose exec api python GenerateSuperAdmin.py --password "StrongPass123"
```

Security defaults in `investra-gov-apps-be/.env`:

- `FLASK_ENV=production`
- `CORS_ORIGINS=http://localhost:3000`
- `CORS_SUPPORTS_CREDENTIALS=false`
- `MAX_CONTENT_LENGTH=10485760` (10MB)
- `RATELIMIT_STORAGE_URI=redis://redis:6379/0`

Check status:

```bash
docker compose ps
```

Stop:

```bash
docker compose down
```
