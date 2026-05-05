# Jernerics Dashboard

A React SPA for analyzing ML experiment data from the jernerics tracking server. Served as static files by the tracking server's FastAPI process on the tailnet-only HTTP port.

## Language

**Dashboard**:
A React SPA that renders sweep analysis views using ECharts. Talks to the tracking server via `/query` (SQL → JSON) and `/artifact/{...}` (artifact proxy). Served as static files by the tracking server — no separate process, no CORS.

**Tracking server**:
The jernerics-server process. Runs gRPC ingestion, HTTP query endpoint, artifact proxy, and static file serving. Single origin for the dashboard.

**Query endpoint**:
`POST /query` on the tracking server. Accepts read-only SQL, returns `{columns, rows}` JSON. Bearer token auth. The dashboard's sole data source.

**Study view**:
The primary analysis page. Selected sweeps from the sidebar drive all content. Charts are always visible in a fixed layout (no panel picker, no configuration step). Layout inspired by Optuna Dashboard:

1. **Best trial card** — objective value, trial ID, all params for the best trial
2. **Parallel coordinates** — all numeric params + objective, ECharts native axis brushing
3. **Metric curves** — step vs metric with percentile bands (median + P25-P75 shade) + individual trial lines
4. **Objective scatter** — trial number vs objective value, colored by sweep
5. **Trial table** — sortable, filterable, expandable rows

**Trial state**:
- **Done**: has a `trial_end` row
- **Unknown**: no `trial_end` row (could be running or dead)

**Objective selector**:
A per-project dropdown where the user picks which result key is the objective and whether to minimize/maximize. Persisted in localStorage.

**Trial detail**:
All params, metrics, results, and artifact previews for a single trial. Reached by expanding a row in the trial table.

**Trial comparison**:
Select 2+ trials, see params/metrics side-by-side with diff highlighting. Includes a metric overlay chart.

**Artifact preview**:
Inline display of artifacts:
- Images (PNG/SVG/JPG): rendered inline
- CSV: paginated sortable table
- JSON: pretty-printed with collapsible nodes
- Other: download link

## Relationships

- The dashboard is a **separate repo** (`jernerics-dashboard`) from jernerics. It builds a static file derivation via its own Nix flake using `bun2nix`. The jernerics NixOS module has a nullable `dashboardPackage` option — wire it to the dashboard's flake output in your machine config.
- The dashboard has **no direct SQLite access**. All data flows through `/query`. Schema coupling is intentional — if queries break, fix them.
- **Auth**: Bearer token entered once in the UI, stored in `localStorage`, sent on every request. Clear localStorage to log out.
- **Theming**: base16 scheme injected at Nix build time via the flake. Mapped to CSS custom properties. ECharts theme derived from the same tokens in `theme/echarts.ts`. No hardcoded colors.
- **Live updates**: polling on a timer re-fetches data for active sweeps. Stops polling when all trials in view have `trial_end`.
- **Sweep identity**: `study_name` format is `{project}_{config_stem}_{timestamp}`. Dashboard parses this for display (sweep name + started date) but keeps the raw name available via copy button.

## Tech stack

- Vite + React + TypeScript
- Bun (package manager, runtime)
- bun2nix (Nix packaging)
- Tailwind CSS + shadcn/ui (layout, tables, controls)
- ECharts via echarts-for-react (chart rendering)
- TanStack Query (data fetching)

## Dev workflow

- `bun run dev` starts Vite on `localhost:5173` with proxy to tracking server over tailnet
- `bun run build` produces `dist/` with static files
- No deploy step during dev — Vite proxies API calls to the real tracking server
- Production: tracking server serves the built static files via FastAPI StaticFiles mount
- **Spike reference**: `spike/` directory has a working prototype with parallel coordinates, objective scatter, and best trial card. Use as reference for chart patterns.

## Chart architecture

All charts use ECharts. Each chart is a React component that:
1. Receives data via props (fetched by TanStack Query hooks in the parent)
2. Builds an ECharts `option` object via `useMemo`
3. Renders `<ReactECharts option={option} theme={mountainTheme} />`

The `mountainTheme` in `theme/echarts.ts` sets axis colors, label colors, background, and the categorical palette. Individual charts only specify data-specific options (series, dimensions, visualMap).

## Spike reference

The `spike/` directory contains a self-contained prototype that proved the architecture:
- ECharts parallel coordinates: ~30 lines of config vs 575 lines of Vega
- Mountain Boosted theme maps cleanly to ECharts
- Optuna-style "select sweeps → see everything" layout feels good

The spike talks to the same `/query` API and uses the same theme tokens. New chart components should follow the spike's pattern.

## Future server-side computations

Parameter importance and contour/response surfaces require running Python (Optuna/random forest). These will need a new endpoint on the tracking server. Not currently implemented. Binned heatmaps can approximate contour plots for dense sweeps without server-side computation.

## Flagged ambiguities

(none yet)

## Known issues

**Database concurrency (resolved)**
The tracking server and dev server both use SQLite with WAL mode. WAL enables concurrent read-only connections during writes. The `/query` endpoint opens a fresh read-only connection per request (`file:path?mode=ro` URI) and closes it in a `finally` block.
