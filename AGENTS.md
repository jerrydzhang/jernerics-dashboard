# AGENTS.md

## Project Documentation

- **`CONTEXT.md`** — Domain glossary and architecture decisions for the dashboard. Read before working on the project.
- **`STYLEGUIDE.md`** — Visual design system (Mountain Boosted). Reference this for all UI work. It defines the visual weight hierarchy, color tokens, surface rules, and anti-patterns. Follow it strictly.
- **`docs/adr/`** — Architectural decision records.

## Environment

The project uses **bun2nix**. All packages live in the Nix store. The devShell sets up `bun`, `bun2nix`, `just`, and `typescript`.

Never use `npm` or `pnpm`. Always use `bun`.

## Commands

All commands run from repo root inside the nix devShell (`nix develop`).

```bash
just check          # biome + tsc + build (must pass before committing)
just fix            # biome auto-fix

bun run dev         # Vite dev server (proxies to tracking server or dev server)
bun run build       # Production build to dist/
nix build           # Full Nix build → result/ with static files
```

## Project Structure

```
src/
  main.tsx           # Entry point, QueryClient + React root
  App.tsx            # Root component (sidebar + study view)
  index.css          # Tailwind + base16 CSS variables
  vite-env.d.ts      # Type declarations

  api/
    client.ts        # query() + auth + artifactUrl
    AuthPrompt.tsx   # Login form

  hooks/
    useProjects.ts   # Projects + sweeps queries
    useObjective.ts  # Per-project objective config (localStorage)
    useActiveSweeps.ts  # Polling for running sweeps

  queries/
    sweeps.ts        # Project/sweep listing SQL
    studyName.ts     # Parse study_name into display components
    trialTable.ts    # Trial params, results, objectives SQL
    metrics.ts       # Metric keys + step data SQL
    results.ts       # Result keys + values SQL
    artifacts.ts     # Artifact listing SQL
    trials.ts        # Trial status SQL

  theme/
    echarts.ts       # ECharts theme from Mountain Boosted tokens

spike/               # Working prototype (reference, not production)
  src/App.tsx        # Has parallel coords + scatter + best trial card

scripts/
  pre-commit         # Runs just check

public/              # Static assets
docs/adr/            # Architectural decisions
```

## Design System

All UI work follows **`STYLEGUIDE.md`**. Key rules:

- **No borders, no box-shadows.** Separation by background color only.
- **No border-radius beyond 2px.** Sharp, tool-like.
- **Visual weight hierarchy:** most UI at level 1 (fg-muted whisper), interactive elements at level 2 (fg-primary), selections at level 3 (fg-bright), state changes at level 4 (accents).
- **All colors via CSS custom properties.** Never hardcode hex values. Use `var(--base00)` etc.
- **Charts use ECharts** with a theme (`theme/echarts.ts`) derived from the base16 accent palette. No Plotly, no Vega.
- **Surfaces:** bg-deep (page) → bg-surface (sidebar, panels) → bg-raised (selections). Max 3 levels deep. Do NOT nest bg-surface inside bg-deep inside bg-surface.
- **Interactive elements** use fg-primary at rest (level 2), not fg-muted. Non-interactive labels stay fg-muted.
- **Tables:** no zebra striping. Faint rhythm line every 5 rows at level 0.
- **Modals:** dimmed backdrop (bg-deep at 60%), popup in bg-surface. No border, no shadow.

If in doubt, re-read the anti-patterns section of STYLEGUIDE.md.

## Tech Stack Conventions

- **React 19** with hooks. No class components.
- **TanStack Query** for all data fetching. Never raw `fetch` outside the API client module.
- **ECharts** via `echarts-for-react` for all charts. Charts are `option` config objects rendered with `<ReactECharts theme={mountainTheme} />`.
- **Tailwind CSS v4** for utility classes. Use `@tailwindcss/vite` plugin.
- **shadcn/ui** for UI primitives (tables, selects, tabs, dialogs). Copy-paste components, not a dependency.

## Pre-commit

**Never use `--no-verify` when committing.** If checks fail, fix the issue.

**Never claim errors are "pre-existing" without verifying.** The previous commit passed. If something fails now, your changes caused it.

## Decision Points

Stop and report back if you encounter:

- A non-trivial design decision (multiple reasonable approaches)
- An ambiguity in the spec that affects behavior
- Something in STYLEGUIDE.md that seems wrong for the current context
- A failure you can't resolve in one attempt

Do not resolve these on your own. Continuing past a decision point without consulting the user is worse than stopping early.
