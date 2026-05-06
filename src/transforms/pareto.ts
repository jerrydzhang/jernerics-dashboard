import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../trial";
import { makeTrialKey } from "../trial";

/**
 * Compute the Pareto-optimal (nondominated) set of trials.
 * A trial dominates another if it's at least as good on all objectives
 * and strictly better on at least one.
 *
 * Returns a Set of trial keys (via makeTrialKey).
 */
export function computeParetoFront(
  trials: Trial[],
  objectives: ObjectiveEntry[],
): Set<string> {
  if (objectives.length === 0) return new Set();

  const pareto = new Set<string>();

  for (let i = 0; i < trials.length; i++) {
    let dominated = false;
    const a = trials[i]!;
    for (let j = 0; j < trials.length; j++) {
      if (i === j) continue;
      const b = trials[j]!;
      if (dominates(b, a, objectives)) {
        dominated = true;
        break;
      }
    }
    if (!dominated) {
      pareto.add(makeTrialKey(a.studyName, a.trialId));
    }
  }

  return pareto;
}

function dominates(a: Trial, b: Trial, objectives: ObjectiveEntry[]): boolean {
  let atLeastAsGood = true;
  let strictlyBetter = false;

  for (const obj of objectives) {
    const va = a.finalMetrics[obj.key];
    const vb = b.finalMetrics[obj.key];
    if (va === undefined || vb === undefined) return false;

    const better = obj.direction === "minimize" ? va < vb : va > vb;
    const equal = va === vb;

    if (!better && !equal) {
      atLeastAsGood = false;
    }
    if (better) {
      strictlyBetter = true;
    }
  }

  return atLeastAsGood && strictlyBetter;
}
