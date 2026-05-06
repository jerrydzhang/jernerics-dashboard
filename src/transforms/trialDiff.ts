import type { Trial } from "../trial";

export interface DiffRow<T> {
  key: string;
  values: (T | null)[];
  isSame: boolean;
}

export interface TrialDiff {
  params: DiffRow<string>[];
  finalMetrics: DiffRow<number>[];
}

export function computeDiff(trials: Trial[]): TrialDiff {
  // Union of all param keys, sorted
  const paramKeys = Array.from(
    new Set(trials.flatMap((t) => Object.keys(t.params))),
  ).sort();

  const finalMetricKeys = Array.from(
    new Set(trials.flatMap((t) => Object.keys(t.finalMetrics))),
  ).sort();

  const params: DiffRow<string>[] = paramKeys.map((key) => {
    const values = trials.map((t) => t.params[key] ?? null);
    const allSame = values.length > 0 && values.every((v) => v === values[0]);
    return { key, values, isSame: allSame };
  });

  const finalMetrics: DiffRow<number>[] = finalMetricKeys.map((key) => {
    const values = trials.map((t) => {
      const v = t.finalMetrics[key];
      return v !== undefined ? v : null;
    });
    const allSame = values.length > 0 && values.every((v) => v === values[0]);
    return { key, values, isSame: allSame };
  });

  return { params, finalMetrics };
}
