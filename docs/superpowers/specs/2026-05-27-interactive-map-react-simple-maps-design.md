# Interactive Map react-simple-maps Design

## Goal

Replace the dashboard's manual SVG island/dot map with `react-simple-maps` rendering a real GeoJSON map of Indonesia's 38 current provinces.

## Inputs

- GeoJSON file: `investra-gov-apps-fe/public/geo/indonesia-provinces.json`
- Source dataset: `denyherianto/indonesia-geojson-topojson-maps-with-38-provinces`, file `GeoJSON/indonesia-38-provinces.geojson`
- Validated shape: `FeatureCollection` with 38 features
- Feature properties used by the app:
  - `PROVINSI`: province display/join name
  - `KODE_PROV`: province code
  - `id`: province code identifier

## Architecture

`InteractiveMap.tsx` remains the single map component. It keeps the existing data fetching, tooltip, legend, loading state, empty state, and cluster stat cards. The SVG path and dot approximation layer is replaced by `ComposableMap`, `ZoomableGroup`, `Geographies`, and `Geography` from `react-simple-maps`.

The component builds province data from `analysisApi.getClusters()` and `datasetApi.getDefaultDatasetData()`, then joins that data to each GeoJSON feature by normalized province name. Because the new GeoJSON contains all 38 provinces, the implementation does not need dot fallback markers for Papua DOB provinces.

## Province name matching

The new GeoJSON mostly matches backend names, but one alias is required:

| GeoJSON `PROVINSI` | Backend/API canonical name |
|---|---|
| Daerah Istimewa Yogyakarta | DI Yogyakarta |

The resolver should also support the existing common aliases used by uploaded/default datasets, including `DKI Jakarta`, `Jakarta`, `Bangka Belitung`, `Kep. Bangka Belitung`, `DIY`, `Yogyakarta`, `NTB`, `NTT`, and Sumatra/Sumatera spelling differences.

## Data flow

1. Fetch cluster assignments and default dataset rows in parallel.
2. Normalize each backend province name to a canonical province key.
3. Store province metadata in a `Map<string, Province>` keyed by canonical province key.
4. Render every GeoJSON feature.
5. For each feature, normalize `feature.properties.PROVINSI` and read the matching `Province` from the map.
6. Fill matched provinces with `CLUSTER_COLORS[province.cluster]`.
7. Fill unmatched provinces with gray so missing data is visible without breaking the map.
8. Hovering a matched province opens the existing tooltip.

## UI behavior

- Keep the existing header controls, zoom percentage, reset button, tooltip, legend, and stat cards.
- Replace manual pan handlers with `ZoomableGroup` movement handling.
- Keep zoom clamped from `1` to `3` in `0.3` increments.
- Use a 2:1 responsive map container with the current sky-blue gradient background.
- Use white province strokes so borders are visible.
- Use a stronger stroke/opacity on hover for provinces that have data.

## Projection

Use `ComposableMap` with `projection="geoMercator"` and a projection config centered on Indonesia:

```tsx
projectionConfig={{ center: [118, -2.5], scale: 1000 }}
```

The implementation may adjust scale/translation only if local visual verification shows the map is clipped or too small.

## Error and empty states

- Keep `BlockSkeleton` while loading.
- Keep the existing empty state if no cluster assignments are available.
- Unknown/unmatched province names are not fatal; they render as gray features and are excluded from cluster stat cards.

## Testing and verification

- Validate the GeoJSON has 38 features and includes `Papua Barat Daya`, `Papua Tengah`, `Papua Pegunungan`, and `Papua Selatan`.
- Run TypeScript build with `npm run build` in `investra-gov-apps-fe`.
- Run the Vite app and manually verify the dashboard map renders, zoom controls work, province hover tooltip works, and legend/stat cards still match available cluster data.
