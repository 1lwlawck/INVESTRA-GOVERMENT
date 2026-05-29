# INVESTRA Government — Monorepo

Investment inequality analysis dashboard for Indonesian provincial data.
PCA + K-Means clustering (k=3, panel mode) → choropleth map + policy recommendations.

## Structure

```
investra-gov-apps-fe/   React 18 + Vite + TypeScript frontend
investra-gov-apps-be/   Flask 3 + SQLAlchemy + scikit-learn backend
```

## Quick Commands

### Frontend (investra-gov-apps-fe/)
```bash
npm run dev          # dev server → http://localhost:3000 (proxies /api → :5000)
npm run build        # tsc + vite build → build/
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run lint:fix     # eslint --fix
npm run format       # prettier --write
npm run test         # vitest run
npm run doctor       # npx react-doctor@latest
```

### Backend (investra-gov-apps-be/)
```bash
flask run --host=0.0.0.0 --port=5000 --reload   # dev server
pytest                                            # run tests
ruff check .                                      # lint
ruff format .                                     # format
flask db upgrade                                  # apply migrations
```

### Docker
```bash
docker-compose up    # full stack (from investra-gov-apps-be/)
```

## Pre-commit / Pre-push Hooks

Hooks live in `.githooks/pre-commit` and `.githooks/pre-push`.
They run automatically if configured via `git config core.hooksPath .githooks`.

- **pre-commit**: ruff (BE staged .py files) + eslint (FE staged .ts/.tsx files)
- **pre-push**: pytest (BE) + vitest + tsc (FE)

### Known quirks
- ESLint uses `--no-warn-ignored` to skip `src/components/ui/**` (shadcn, intentionally ignored)
- Prettier enforces LF line endings (`endOfLine: "lf"`) — Windows CRLF will fail the hook
- Run `npx prettier --write <file>` before staging if you see CRLF warnings

## Architecture Decisions

- **k=3 everywhere**: All `analysisApi.run()` calls use `k: 3, autoK: false`. Do not change to k=4.
- **Panel mode**: Analysis uses `dataMode: 'panel'`, `panelYearStart: 2022`, `panelYearEnd: 2024`
- **Map data source**: `InteractiveMap` uses `panelStability.provinces[].dominantCluster` (not `assignments` — those are panel-level keys, not province names)
- **CVA variants**: `badge-variants.ts`, `button-variants.ts`, `toggle-variants.ts`, `navigation-menu-variants.ts` are separate files so component files only export components (Fast Refresh requirement)
- **shadcn ui**: `src/components/ui/**` is excluded from ESLint (`eslint.config.ts` ignores it)

## Roles

- `superadmin` — can upload datasets, manage users
- `admin` — can view history, activate versions
- `user` — read-only

## Branch Strategy

- `main` — production
- `development` — active development branch (default for PRs)
