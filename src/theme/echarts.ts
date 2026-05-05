import type { ComposeOption } from "echarts/core";

/**
 * ECharts theme derived from the Mountain Boosted base16 palette.
 * Applied via the `theme` prop on ReactECharts.
 *
 * Colors reference CSS custom properties at build time — the hex values
 * come from the base16 scheme in index.css. When the scheme changes
 * (light mode, different Stylix config), rebuild to pick up new values.
 */

const colors = {
  base00: "#100f0e",
  base01: "#1b1918",
  base02: "#292624",
  base03: "#6d6562",
  base04: "#c4a6a8",
  base05: "#d4ceca",
  base06: "#e8e2dd",
  base07: "#fafafa",
};

/** Categorical palette for series coloring (trials, sweeps, param groups). */
export const categorical = [
  "#db8779", // warm rose
  "#d4a843", // amber gold
  "#8dba7c", // sage green
  "#5eb8c9", // teal
  "#9b8fd4", // soft purple
  "#d68fbf", // mauve pink
  "#c9a054", // ochre
];

export const mountainTheme: ComposeOption<never> = {
  backgroundColor: colors.base01,
  textStyle: {
    color: colors.base03,
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  title: {
    textStyle: {
      color: colors.base06,
      fontWeight: "normal",
      fontSize: 14,
    },
  },
  legend: {
    textStyle: { color: colors.base03, fontSize: 11 },
  },
  tooltip: {
    backgroundColor: colors.base02,
    textStyle: { color: colors.base05, fontSize: 12 },
  },
  valueAxis: {
    axisLine: { lineStyle: { color: colors.base02 } },
    axisTick: { lineStyle: { color: colors.base02 } },
    axisLabel: { color: colors.base03, fontSize: 11 },
    splitLine: { lineStyle: { color: colors.base02, type: "dashed" } },
    nameTextStyle: { color: colors.base03, fontSize: 11 },
  },
  color: categorical,
} as never;
