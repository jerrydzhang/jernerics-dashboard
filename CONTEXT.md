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
The primary analysis page. Selected sweeps from the sidebar drive all content. Charts are always visible in a fixed layout (no panel picker, no configuration step). When multiple sweeps are selected, all charts merge trials into one view with sweep as the color dimension.

Layout, top to bottom:

1. **Objective summary strip** — one compact card per objective: name + direction, best/median/worst values, trial count, sparkline distribution. Cards sit side-by-side horizontally.
2. **Objective scatter** — objectives plotted against each other (2 objectives) or trial-index vs objective (1 objective). Pareto front highlighted for multi-objective. Reference baselines as horizontal/vertical lines. Colored by sweep.
3. **Metric curves** — step vs metric with percentile bands (median + P25-P75 shade) + individual trial lines. Colored by sweep. One metric at a time by default, with an optional second Y-axis (add second metric) for spotting tradeoffs directly. Selector shows union of all metric keys across selected sweeps; trials missing a metric simply have no line. Axis scale selectable (linear/log/symlog/custom transforms). Spot overfitting, divergence, collapse.
4. **Parallel coordinates** — all numeric params + objectives, with sweep as a categorical axis. ECharts native axis brushing for selection. Reveals param sensitivity and correlations.
5. **Trial table** — sortable, filterable rows. Each row has an artifact indicator (hover → stacked popover with previews). Expandable for full trial detail (all params, metrics, artifact previews).

**Trial state**:
- **Done**: has a `trial_end` row
- **Incomplete**: no `trial_end` row (could be running, dead, or queued — the dashboard has no scheduler visibility)

Incomplete trials are included in all views by default, visually distinguished (dashed lines in metric curves, status label in table). The dashboard never assumes why a trial is incomplete.

**Objective selector**:
A per-project control where the user picks one or more result keys as objectives, each with a direction (minimize/maximize). Persisted in localStorage. Single-objective is the degenerate case (list of one). Multi-objective is the expected norm — most ML work involves trade-offs (accuracy vs latency, precision vs recall, complexity vs fit). Charts adapt to the number of objectives:
- 1 objective: best trial card, single-axis ranking
- 2 objectives: Pareto front drawn as a stepped line on the scatter plot, nondominated trials highlighted with larger markers
- 3+ objectives: scatter axis selectors let user pick which 2 objectives to plot; Pareto front computed for all objectives but displayed for the selected pair. Trial table always has "Pareto-optimal only" filter regardless of count.

**Trial detail**:
All params, metrics, results, and artifact previews for a single trial. Reached by expanding a row in the trial table.

**Trial selection**:
A shared selection state across all charts. Click or brush on any chart to select trials → those trials are highlighted everywhere (bright), unselected trials are dimmed but remain visible for context. This is an overlay, not a hard filter — you always see the full sweep, with your selected trials standing out.

Selection flows: parallel coordinates brush → highlight on scatter, curves, table. Table row click → highlight on all charts. Scatter lasso → same.

**Trial comparison**:
Select 2+ trials, see params/metrics side-by-side with diff highlighting. Includes a metric overlay chart. Reached via explicit selection action (e.g., a "compare" button that appears when multiple trials are selected).

**Artifact indicator**:
A compact indicator in each trial table row showing that the trial has artifacts. On hover, a stacked popover displays all artifacts for that trial:
- Images (PNG/SVG/JPG): rendered inline at preview size
- CSV: formatted table preview
- JSON: pretty-printed with collapsible nodes
- Other: download link
No row expansion needed to preview artifacts. Hover is the primary viewing gesture. If a trial has many artifacts, the popover is capped and full viewing requires row expansion.

## Relationships

- The dashboard is a **separate repo** (`jernerics-dashboard`) from jernerics. It builds a static file derivation via its own Nix flake using `bun2nix`. The jernerics NixOS module has a nullable `dashboardPackage` option — wire it to the dashboard's flake output in your machine config.
- The dashboard has **no direct SQLite access**. All data flows through `/query`. Schema coupling is intentional — if queries break, fix them.
- **Auth**: Bearer token entered once in the UI, stored in `localStorage`, sent on every request. Clear localStorage to log out.
- **Theming**: base16 scheme injected at Nix build time via the flake. Mapped to CSS custom properties. ECharts theme derived from the same tokens in `theme/echarts.ts`. No hardcoded colors.
- **Live updates**: polling on a timer re-fetches data for active sweeps. Stops polling when all trials in view have `trial_end`.
- **Sweep identity**: `study_name` format is `{project}_{config_stem}_{timestamp}`. Dashboard parses this for display (sweep name + started date) but keeps the raw name available via copy button.

## Architecture principle

Each chart panel is a self-contained React component that receives data via props and emits selection events. No panel reaches into another panel's state. The parent (StudyView) owns:

- **Data**: fetched via TanStack Query hooks, passed down as props
- **Selection state**: which trials are highlighted (shared across panels)
- **Objective config**: which result keys are objectives, directions

Each panel receives: data + selection state + config. Each panel emits: "user selected these trials."

This makes panels swappable — removing the summary strip is removing one `<ObjectiveSummaryStrip>` from JSX. Removing cross-chart selection means removing the shared selection state, with each panel managing its own internal selection. Panels don't change either way.

Some of our design choices (cross-chart highlighting, summary strip, artifact hover popovers) are unproven — they don't exist in established dashboards like Optuna, wandb, MLflow, or Neptune. Building with composable panels lets us iterate by swapping components without architectural rework.

### Anti-abstraction rules

**No port/interface layer between StudyView and panels.** The component boundary IS the seam — that's what React components already provide. Props in, events out. Do not wrap panels in adapters, interfaces, or abstraction layers.

**Do not introduce a seam until a second adapter exists.** One adapter (the real implementation) means the seam is hypothetical — just indirection. Two adapters (e.g., real + test fake, or ECharts + alternative renderer) means the seam is real and earns its keep.

Concrete consequences:
- No `IParallelCoordinates` interface wrapping the ECharts component. Just `<ParallelCoordinates>`.
- No abstraction over the query layer (`src/queries/`) beyond what `src/api/client.ts` already provides. The SQL functions ARE the implementation.
- No dependency injection framework. Props are injection enough.
- If a panel needs internal seams for testing (e.g., separating data transform from rendering), those seams stay PRIVATE to the panel. They are not exposed through the panel's props.

**Depth means the panel's interface is small and its implementation is large.** A good panel takes a few props and hides hundreds of lines of ECharts option construction, axis transform logic, and brushing state management. A bad panel leakily exposes ECharts concepts through its props because the implementation is too thin.

**Test through the interface, not past it.** Panel tests render the component with props and assert on visible output or behavior — they do not mock ECharts internals or assert on internal state. If a test would break when the implementation changes but the behavior doesn't, the test is coupled past the interface.

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


## Chart architecture

All charts use ECharts. Each chart is a React component that:
1. Receives data via props (fetched by TanStack Query hooks in the parent)
2. Builds an ECharts `option` object via `useMemo`
3. Renders `<ReactECharts option={option} theme={mountainTheme} />`

The `mountainTheme` in `theme/echarts.ts` sets axis colors, label colors, background, and the categorical palette. Individual charts only specify data-specific options (series, dimensions, visualMap).

## Spike reference (removed)

The `spike/` directory contained a self-contained prototype that proved the architecture (ECharts parallel coordinates in ~30 lines vs 575 lines of Vega, Mountain Boosted theme mapping cleanly). It has been removed. New chart components should follow the same pattern: build ECharts `option` via `useMemo`, render with `<ReactECharts theme={mountainTheme} />`.

## Future server-side computations

Parameter importance and contour/response surfaces require running Python (Optuna/random forest). These will need a new endpoint on the tracking server. Not currently implemented. Binned heatmaps can approximate contour plots for dense sweeps without server-side computation.

## Data shapes in practice

The dashboard must handle these representative workloads (captured in `dev_server/generate.py`):

- **Standard DL training**: loss curves + accuracy over steps, multiple result scalars, image/CSV/JSON artifacts. Params are mixed numeric + categorical + boolean.
- **Embedding/ANN search**: recall@K + latency metrics, small step counts, params like ef_construction/n_lists that are all numeric.
- **Multi-objective**: two competing results (accuracy vs latency) with a Pareto front. Params include categorical model sizes.
- **Negative-valued results**: log-likelihood (large negative numbers) alongside positive perplexity. Tests that charts handle sign and magnitude correctly.
- **Correlated params**: LR × weight_decay interaction producing visible structure in parallel coordinates / heatmaps.
- **Irregular timestamps**: pause/resume gaps in step data. Steps are still monotonically increasing but wall-clock time has jumps.
- **Sparse sweeps**: as few as 5 trials with 10 steps — charts must not break or look silly with very little data.

**Reference baseline**:
A horizontal or vertical line on a chart marking a target value. Two sources: (1) user types a number into the chart panel, persisted per-project in localStorage; (2) baseline sweeps — single-trial sweeps run alongside main sweeps (e.g., trivial model, oracle), selected in the sidebar and merged into charts naturally.

## Chart configuration model

The dashboard uses a **fixed layout** (like Optuna Dashboard) — select sweeps, see a predefined set of chart panels. There is no panel picker or drag-and-drop layout editor.

Each chart panel supports **axis/channel selectors** (dropdowns to change what metric/result is displayed) and **display controls**:

- **Axis scale**: preset dropdown — linear, log, symlog, `-log₁₀(1-x)` (near-one accuracy). Values are transformed client-side before rendering. New presets added as needed; no user-defined formula parser.
- **Reference baselines**: optional horizontal line/region on any chart showing a target value (e.g., true solution for symbolic regression, known state-of-the-art). Implemented via ECharts `markLine`.
- **Cosmetic controls**: gridlines, spacing, titles — good defaults with per-chart toggles.

## Flagged ambiguities

(none yet)

## Known issues

**Database concurrency (resolved)**
The tracking server and dev server both use SQLite with WAL mode. WAL enables concurrent read-only connections during writes. The `/query` endpoint opens a fresh read-only connection per request (`file:path?mode=ro` URI) and closes it in a `finally` block.
