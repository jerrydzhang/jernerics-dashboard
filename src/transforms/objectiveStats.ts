import type { Trial } from "../trial";
import { makeTrialKey } from "../trial";

export interface ObjectiveStats {
  best: number;
  median: number;
  worst: number;
  count: number;
  incompleteCount: number;
  histogram: number[];
  binTrialKeys: string[][];
  bestTrialKey: string;
}

export function computeObjectiveStats(
  trials: Trial[],
  key: string,
  direction: "minimize" | "maximize",
): ObjectiveStats {
  const entries: { value: number; trialKey: string; complete: boolean }[] = [];

  for (const t of trials) {
    const raw = t.finalMetrics[key];
    if (raw === undefined) continue;
    const v = Number(raw);
    if (!Number.isFinite(v)) continue;
    entries.push({
      value: v,
      trialKey: makeTrialKey(t.studyName, t.trialId),
      complete: t.complete,
    });
  }

  entries.sort((a, b) => a.value - b.value);
  const values = entries.map((e) => e.value);

  if (values.length === 0) {
    return {
      best: NaN,
      median: NaN,
      worst: NaN,
      count: 0,
      incompleteCount: 0,
      histogram: [],
      binTrialKeys: [],
      bestTrialKey: "",
    };
  }

  const bestIdx = direction === "maximize" ? entries.length - 1 : 0;
  const bestEntry = entries[bestIdx]!;
  const best = bestEntry.value;
  const bestTrialKey = bestEntry.trialKey;
  const worst =
    direction === "maximize" ? values[0]! : values[values.length - 1]!;
  const mid = Math.floor(values.length / 2);
  const median =
    values.length % 2 === 0
      ? (values[mid - 1]! + values[mid]!) / 2
      : values[mid]!;

  const incompleteCount = entries.filter((e) => !e.complete).length;

  const { histogram, binTrialKeys } = computeHistogram(entries);

  return {
    best,
    median,
    worst,
    count: values.length,
    incompleteCount,
    histogram,
    binTrialKeys,
    bestTrialKey,
  };
}

function computeHistogram(
  entries: { value: number; trialKey: string }[],
  maxBins = 15,
): { histogram: number[]; binTrialKeys: string[][] } {
  if (entries.length === 0) return { histogram: [], binTrialKeys: [] };
  const values = entries.map((e) => e.value);
  const min = values[0]!;
  const max = values[values.length - 1]!;
  if (min === max) {
    return {
      histogram: [entries.length],
      binTrialKeys: [entries.map((e) => e.trialKey)],
    };
  }

  const binWidth = (max - min) / maxBins;
  const bins = new Array(maxBins).fill(0) as number[];
  const binKeys: string[][] = Array.from({ length: maxBins }, () => []);
  for (const e of entries) {
    let idx = Math.floor((e.value - min) / binWidth);
    if (idx >= maxBins) idx = maxBins - 1;
    bins[idx]!++;
    binKeys[idx]!.push(e.trialKey);
  }
  return { histogram: bins, binTrialKeys: binKeys };
}
