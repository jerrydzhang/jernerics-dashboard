import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../trial";
import { makeTrialKey } from "../trial";
import { computeParetoFront } from "./pareto";

/**
 * Given trials and two objectives (x-axis and y-axis), compute the
 * Pareto front and return sorted points for rendering a stepped line.
 *
 * Returns points sorted by the x-axis objective value.
 */
export function computeParetoSteps(
  trials: Trial[],
  objectives: [ObjectiveEntry, ObjectiveEntry],
): { x: number; y: number; key: string }[] {
  const front = computeParetoFront(trials, [objectives[0], objectives[1]]);
  if (front.size === 0) return [];

  const [xObj, yObj] = objectives;

  const points: { x: number; y: number; key: string }[] = [];
  for (const t of trials) {
    const key = makeTrialKey(t.studyName, t.trialId);
    if (!front.has(key)) continue;
    const x = t.finalMetrics[xObj.key];
    const y = t.finalMetrics[yObj.key];
    if (x === undefined || y === undefined) continue;
    points.push({ x, y, key });
  }

  points.sort((a, b) => a.x - b.x);
  return points;
}
