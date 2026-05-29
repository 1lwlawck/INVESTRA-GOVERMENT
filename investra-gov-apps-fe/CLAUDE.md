# INVESTRA Frontend

React 18 + Vite + TypeScript dashboard. See root `../CLAUDE.md` for monorepo-wide commands and decisions.

## Stack

- **Build**: Vite 6 (`@vitejs/plugin-react-swc`), output → `build/`
- **Styling**: Tailwind v4 (`@tailwindcss/vite`), shadcn/ui components
- **State**: Zustand (`src/stores/`)
- **Routing**: react-router-dom v7 (`src/routes/`)
- **Charts**: recharts (PCA/cluster charts), react-leaflet (choropleth map)
- **Forms**: react-hook-form
- **Path alias**: `@/` → `src/`

## Directory Layout

```
src/
  components/
    atoms/        # smallest elements (Button, Badge re-exports via index.ts)
    molecules/    # composed building blocks (Card, Toggle groups)
    organisms/    # complex units (charts, navigation, cards)
    ui/           # shadcn-generated — EXCLUDED from ESLint, avoid hand-editing
  core/
    api/          # *.api.ts — typed API clients; http-client.ts wraps fetch+token
    auth/         # AuthBootstrap
    entities/     # domain types
  pages/          # route pages (dashboard, analysis, dataset, policy, etc.)
  stores/         # Zustand stores (auth.store.ts)
  shared/         # constants, utils, types
  routes/         # router config + guards (AuthGuard, ErrorBoundary)
  templates/      # DashboardTemplate layout
  hooks/          # shared hooks
```

## Conventions

- **Atomic design**: components organized atoms → molecules → organisms. Re-export through `index.ts` barrels.
- **CVA variants in separate files**: A component file must export ONLY components (Fast Refresh / `react-refresh/only-export-components`). Put `cva()` definitions in a sibling `*-variants.ts` and import from there. Examples: `ui/button.tsx` + `ui/button-variants.ts`.
- **Tailwind size shorthand**: use `size-N` instead of `w-N h-N` when both axes match (Tailwind v3.4+).
- **Stable list keys**: never use array index as `key` — use a data-derived stable id (province name, item.title, etc.).
- **Intl formatters**: hoist `Intl.NumberFormat`/`DateTimeFormat` to module scope (see `shared/utils/format.util.ts`), never construct per-call.

## API Layer (`src/core/api/`)

- `http-client.ts` — `apiFetch()` wraps fetch, injects JWT, sets `Content-Type: application/json`. For file uploads use raw `fetch` (see `dataset.api.ts uploadCSV`).
- Types in `*.api.ts` mirror backend Python response shapes. **Keep them tight** — a loose `Record<string, number>` on `ClusterResult.assignments` once hid a province-vs-panel-key bug.
- `analysis.api.ts` — `run()`, `getClusters()`, `getPCA()`. Always `k: 3, autoK: false, dataMode: 'panel'`.

## Map (`organisms/charts/InteractiveMap.tsx`)

- Uses **react-leaflet v4** (`MapContainer` + `GeoJSON`). NOT react-simple-maps (removed).
- GeoJSON source: `public/geo/indonesia-provinces.json` (property `PROVINSI`, 38 features).
- Province → cluster mapping comes from `panelStability.provinces[].dominantCluster` (primary) or `summary[].provinces` (fallback). Do NOT use `assignments` — its keys are panel-level (`Province|Year`), not province names.
- `PROVINCE_ALIASES` maps dataset/cluster names to GeoJSON `PROVINSI` spellings. Add new aliases there when a province renders grey.
- Zoom buttons bridge to Leaflet via the `MapZoomSync` child + `useMap()` hook (`ref={setMap}` external-state pattern).
- `leaflet/dist/leaflet.css` is imported at the top of the component.

## Verification Before Commit

```bash
npm run typecheck    # must be clean
npm run build        # must succeed
npm run test         # vitest
```

Pre-commit hook runs ESLint on staged FE files with `--max-warnings=0`. If you see `prettier/prettier` CRLF warnings, run `npx prettier --write <file>` then re-stage.

## Quality Tool

`npm run doctor` (react-doctor) scores the codebase. A PostToolBatch hook (`.claude/hooks/react-doctor.sh`) runs it after edits, and CI runs `.github/workflows/react-doctor.yml`. Treat findings as hypotheses — read the code before fixing, and watch for false positives (e.g. shadcn `ui/**` flagged as unused files).
