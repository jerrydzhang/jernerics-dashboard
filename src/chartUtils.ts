import { categorical } from "./theme/register";
import { makeTrialKey, type Trial } from "./trial";

export function shortSweep(name: string): string {
  const idx = name.lastIndexOf("_");
  if (idx < 0) return name;
  return name.slice(0, idx);
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(3);
  return v.toPrecision(3);
}

export function buildTrialLookup(trials: Trial[]): Map<string, Trial> {
  const map = new Map<string, Trial>();
  for (const t of trials) {
    map.set(makeTrialKey(t.studyName, t.trialId), t);
  }
  return map;
}

export function buildSweepColorMap(names: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const [i, name] of names.entries()) {
    const c = categorical[i % categorical.length];
    if (c) map.set(name, c);
  }
  return map;
}
