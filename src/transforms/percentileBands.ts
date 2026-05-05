export interface PercentileBand {
  step: number;
  pLow: number;
  p50: number;
  pHigh: number;
}

import type { MetricSeries } from "./groupMetrics";

export function computePercentileBands(
  series: MetricSeries[],
  pLow: number,
  pHigh: number,
): PercentileBand[] {
  if (series.length === 0) return [];

  // Collect all unique steps
  const stepSet = new Set<number>();
  for (const s of series) {
    for (const { step } of s.steps) {
      stepSet.add(step);
    }
  }
  const steps = Array.from(stepSet).sort((a, b) => a - b);

  // Build lookup: step -> values from all series present at that step
  const result: PercentileBand[] = [];
  for (const step of steps) {
    const values: number[] = [];
    for (const s of series) {
      const entry = s.steps.find((e) => e.step === step);
      if (entry !== undefined) {
        values.push(entry.value);
      }
    }
    if (values.length === 0) continue;

    values.sort((a, b) => a - b);
    result.push({
      step,
      pLow: percentile(values, pLow),
      p50: percentile(values, 50),
      pHigh: percentile(values, pHigh),
    });
  }

  return result;
}

function percentile(sorted: number[], p: number): number {
  // Linear interpolation (R-4 method)
  const n = sorted.length;
  if (n === 1) return sorted[0] ?? 0;

  const rank = (p / 100) * (n - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  const frac = rank - lo;
  const vLo = sorted[lo] ?? 0;
  const vHi = sorted[hi] ?? 0;
  return vLo * (1 - frac) + vHi * frac;
}
