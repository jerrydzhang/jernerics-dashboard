# Jernerics Dashboard — Mountain Boosted Style Guide

A living design system for the dashboard UI. Derived from the Mountain
Boosted base16 scheme and the same design principles used in the
author's Emacs configuration. Agents should reference this document
when writing UI code.

---

## 1. Design Philosophy

### Three principles

**1. Quiet density.**

Every element on screen earns its place by being *useful*, not by being
*visible*. A table with twelve columns can feel lighter than one with
four if the visual weight is distributed correctly. Most of the UI
speaks at a whisper. Only the thing you're actively looking at speaks
at full volume.

**2. Layers, not boxes.**

Separation comes from background color shifts (`bg-deep` → `bg-surface`
→ `bg-raised`) and spacing, never from drawn lines or shadows. A chart
panel is a bg-surface rectangle sitting on a bg-deep page. No border,
no card wrapper, no shadow.

**3. Tool, not SaaS.**

The dashboard looks like a data analysis tool that belongs in the same
computing environment as the terminal and editor. No rounded cards with
drop shadows, no gradient hero sections, no cheerful onboarding
illustrations. Flat surfaces, warm muted colors, information density.

---

## 2. Visual Weight System

Every element maps to one of five levels:

| Level | Name      | Color token | Use for                                    |
|-------|-----------|-------------|--------------------------------------------|
| 0     | Invisible | `bg-deep`   | Things that should vanish (borders, gaps)  |
| 1     | Whisper   | `fg-muted`  | Inactive chrome, labels, column headers    |
| 2     | Speaking  | `fg-primary`| Body text, table data, chart axes          |
| 3     | Present   | `fg-bright` | Selected items, headings, active elements  |
| 4     | Signal    | Accents     | State changes ONLY (running, errors)       |

### Rules

- **Most of the UI is level 1.** Column headers, inactive sidebar
  items, metric units, status labels — all whisper.
- **Level 4 is for change, not presence.** A green dot on a running
  trial is a signal. A green accent on every static label is noise.
- **Never skip a level.** Don't jump from whisper directly to signal.
- **Level 0 makes borders disappear.** If you need a border, you
  probably need a background color shift instead.

---

## 3. Color Tokens

All colors come from the base16 scheme injected at build time. Never
hardcode hex values — always reference the CSS custom property.

### Base palette (mapped to CSS variables)

| Token         | CSS Variable        | Role                                |
|---------------|---------------------|--------------------------------------|
| `bg-deep`     | `--base00`          | Page background                      |
| `bg-surface`  | `--base01`          | Sidebar, panels, cards, nav          |
| `bg-raised`   | `--base02`          | Active selections, hover, highlight  |
| `fg-muted`    | `--base03`          | Inactive text, labels, chrome        |
| `fg-dim`      | `--base04`          | Use sparingly (deprecated)           |
| `fg-primary`  | `--base05`          | Body text, data values               |
| `fg-bright`   | `--base06`          | Headings, emphasis, selected items   |
| `fg-max`      | `--base07`          | Maximum emphasis (rare)              |

### Accent colors (foreground only, never large surfaces)

| Accent       | CSS Variable   | Use for                               |
|--------------|----------------|----------------------------------------|
| `rose`       | `--base08`     | Errors, failure state                  |
| `gold`       | `--base09`     | Warnings, modified indicators         |
| `olive`      | `--base0A`     | Secondary highlight                    |
| `green`      | `--base0B`     | Success, running state, insert         |
| `steel`      | `--base0C`     | Info, links, visual highlight          |
| `lavender`   | `--base0D`     | Branch names, tags, tertiary           |
| `mauve`      | `--base0E`     | Special states, replace                |

### Chart categorical palette

For coloring distinct series (trials, sweeps, param groups):

```
[rose, gold, olive, green, steel, lavender, mauve]
```

Cycle if more than 7 are needed. These are the same accent tokens —
warm, muted, consistent with the rest of the UI. No neon. No
saturated primaries.

---

## 4. Surfaces & Layout

### Layer stack

```
Layer 0  Page background       bg-deep (base00)
Layer 1  Sidebar, nav          bg-surface (base01)
Layer 2  Chart panels, cards   bg-surface (base01), no border
Layer 3  Raised/selected       bg-raised (base02)
Layer 4  Modals, popups        opaque bg-surface, generous padding
```

### Surface rules

- **No `box-shadow` anywhere.** Not on cards, not on dropdowns, not on modals.
- **No borders.** `border: none`. Separation is background color only.
- **No `border-radius` beyond `2px`.** Sharp, tool-like. A `4px` radius on a small pill badge is acceptable. Nothing larger.
- **Charts sit flush** on bg-deep, not inside bordered card wrappers.
- **Selection = bg-raised.** That's the only selection indicator. No checkmarks, no left-border accents, no outline rings.

### Translation from Emacs

The dashboard has deeper visual nesting than Emacs (typically 2 layers).
To avoid a murky checkerboard of alternating bg-deep/bg-surface:

- **Flatten the hierarchy to 3 levels max.** bg-deep (page edge) →
  bg-surface (sidebar + chart canvas) → bg-raised (panels, selections).
  Do NOT nest bg-surface inside bg-deep inside bg-surface.
- **Use spacing as the separator.** Wider gaps between panels (12-16px)
  so the bg-deep negative space between bg-surface panels reads as
  intentional structure.

**Discoverability.** Emacs is keyboard-first; the dashboard is
mouse-driven. Interactive elements (sweep items, tab buttons, panel
controls) should use fg-primary at rest (level 2), not fg-muted.
This signals "you can act on me" before the user hovers. Non-interactive
labels stay at fg-muted (level 1).

**Table scanning.** Dense tables with no grid lines become a wall of
data. Add a subtle horizontal rule every 5 rows at level 0 (fg-muted at
very low opacity, barely visible) to break the wall into scannable
chunks. Not zebra striping — just a faint rhythm line.

**Modals and popups.** Use a dimmed backdrop (bg-deep at 60% opacity)
that visually recesses the content behind the popup. The popup itself is
bg-surface, opaque, with generous inner padding. No border, no shadow —
the backdrop contrast is the boundary. This mirrors the Emacs child
frame pattern where the OS window manager provides the visual priority.

---

## 5. Typography

### Weight hierarchy

| Use              | Weight     | Color       |
|------------------|------------|-------------|
| Page headings    | semi-bold  | fg-bright   |
| Section headings | medium     | fg-bright   |
| Body text        | normal     | fg-primary  |
| Labels           | normal     | fg-muted    |
| Data values      | normal     | fg-primary  |
| Emphasis         | semi-bold  | fg-bright   |

### Rules

- One weight step per level of importance. Don't jump from normal
  directly to bold.
- Don't use `font-size` alone to create hierarchy — combine with color
  weight.
- Monospace for metric values, trial IDs, git hashes.

---

## 6. Spacing

| Context                    | Value     | Rationale                           |
|----------------------------|-----------|--------------------------------------|
| Page outer padding         | 16px      | Breathing room at edges              |
| Sidebar width              | 280px     | Fits sweep names + timestamps        |
| Panel gap                  | 8px       | Minimal, let bg contrast separate    |
| Table cell padding         | 8px 12px  | Compact but scannable                |
| Modal inner padding        | 16px      | Generous, like Emacs popup frames    |
| Section spacing            | 16px      | Between chart panels                 |
| Intra-section spacing      | 4–8px     | Tight — labels to values, etc.       |

### Spacing principle

> Generous padding on the outside (page edges, modal interiors).
> Tight spacing on the inside (cell padding, label-value pairs).
> Open at the boundaries, dense at the content.

---

## 7. Component Patterns

### Tables

- No zebra striping. No row borders.
- Header: fg-muted on bg-surface.
- Body: fg-primary on bg-deep.
- Hover: bg-raised (level 3).
- Selected: bg-raised + fg-bright.
- Sticky columns (trial ID, objective) when scrolling horizontally.

### Sidebar (sweep selector)

- bg-surface strip, full height.
- Each sweep item: sweep name (fg-muted when inactive, fg-bright when
  selected) + timestamp (fg-muted).
- Selected item: bg-raised background. No checkbox, no radio button.
- Multi-select: each selected item gets bg-raised. No primary/secondary
  distinction.

### Chart panels

- bg-surface rectangle, no border, no shadow.
- Chart title: fg-bright, medium weight.
- Axis labels: fg-muted.
- Axis ticks/gridlines: bg-raised (subtle, not dominant).
- Panel controls (metric dropdown, etc.): small, fg-muted, bg-raised
  when open.
- ECharts theme (`theme/echarts.ts`) sets background, axis, label, and
  palette colors from the same base16 tokens. Individual charts inherit
  the theme and only specify data-specific options.

### Trial comparison diff

- Same values: fg-muted (whisper — nothing to see).
- Different values: fg-primary (speaking — this is the useful part).
- Added/removed trials: accent indicators where appropriate.

### Artifact previews

- Images: rendered at natural aspect ratio, max-width constrained.
- No border on images. They sit on bg-deep and the content edge is the
  boundary.
- JSON: monospace, fg-primary, with collapsible node controls in
  fg-muted.
- CSV: standard table styling with the rules above.

---

## 8. Interactive States

| State        | Treatment                                  |
|--------------|---------------------------------------------|
| Default      | As defined by visual weight level           |
| Hover        | bg-raised (level 3 background)             |
| Active/press | fg-bright (level 3 foreground)             |
| Selected     | bg-raised + fg-bright                      |
| Focus        | 2px outline in accent-lavender             |
| Disabled     | opacity 0.4                                 |
| Loading      | Skeleton placeholder in bg-raised shape     |
| Error        | accent-rose text, no background change      |

### Rules

- Focus ring (lavender outline) is the ONLY visible border-like element.
  It's an accessibility requirement, not decoration.
- No transitions or animations beyond 150ms for state changes. Nothing
  bouncy, nothing that draws attention to the UI rather than the data.

---

## 9. Dark/Light Mode

- Follows system preference (`prefers-color-scheme`).
- The base16 scheme is swapped at build time — the light scheme maps
  the same semantic tokens (bg-deep, fg-primary, etc.) to different
  hex values.
- Charts use the same accent palette regardless of mode. The accent
  tokens may shift slightly in light mode for contrast, but the
  identity stays warm and muted.

---

## 10. Anti-patterns (Do Not Do This)

- ❌ Cards with rounded corners and box-shadows
- ❌ Gradient backgrounds or buttons
- ❌ Accent colors on static elements (tabs, labels, icons)
- ❌ Large colored surfaces (badges, pills, hero sections)
- ❌ Zebra striping in tables
- ❌ Visible borders between layout regions
- ❌ Floating action buttons or bottom nav bars
- ❌ Skeleton screens with animated shimmer (use static bg-raised)
- ❌ Logos, illustrations, or decorative elements
- ❌ Blue/purple as primary color (use the base16 palette)
