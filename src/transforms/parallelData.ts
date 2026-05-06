import type { ObjectiveEntry } from "../hooks/useObjective";
import { parseStudyName } from "../queries/studyName";
import type { Trial } from "../trial";
import { makeTrialKey } from "../trial";
import { type AxisScale, applyAxisScale, inverseAxisScale } from "./axisScale";

export interface ParallelAxis {
  dim: number;
  name: string;
  type: "value" | "category";
  data?: string[];
  tickFormatter?: (value: number) => string;
}

export interface ParallelData {
  axes: ParallelAxis[];
  data: number[][];
  trialKeys: string[];
}

/**
 * Shorten a study_name for display as an axis label.
 * Uses configStem when parseable, falls back to the raw name.
 */
function sweepLabel(studyName: string): string {
  const parsed = parseStudyName(studyName);
  if (!parsed) return studyName;
  // When multiple sweeps share a configStem, disambiguate with date
  return parsed.configStem;
}

/**
 * Build parallel coordinates data from trials and objectives.
 * Sweep axis is first (leftmost), then params, then objectives (rightmost).
 * Params classified as numeric (value) or categorical (category).
 */
export function buildParallelData(
  trials: Trial[],
  objectives: ObjectiveEntry[],
  scales?: Map<string, AxisScale>,
): ParallelData {
  if (trials.length === 0) {
    return { axes: [], data: [], trialKeys: [] };
  }

  // Sweep axis (categorical, first axis) — use shortened labels
  const uniqueSweepNames = Array.from(
    new Set(trials.map((t) => t.studyName)),
  ).sort();
  const sweepLabels = uniqueSweepNames.map(sweepLabel);
  // Disambiguate: if two sweeps produce the same label, append date
  const labelCounts = new Map<string, number>();
  for (const label of sweepLabels) {
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
  }
  const finalSweepLabels = uniqueSweepNames.map((name, i) => {
    const label = sweepLabels[i] ?? name;
    if ((labelCounts.get(label) ?? 0) > 1) {
      const parsed = parseStudyName(name);
      if (parsed) {
        const d = parsed.startedDate;
        return `${label} ${d.getMonth() + 1}/${d.getDate()}`;
      }
    }
    return label;
  });

  const sweepAxis: ParallelAxis = {
    dim: 0,
    name: "sweep",
    type: "category",
    data: finalSweepLabels,
  };

  // Discover all param keys
  const paramKeys = Array.from(
    new Set(trials.flatMap((t) => Object.keys(t.params))),
  ).sort();

  // Classify each param as numeric or categorical
  const paramAxes: ParallelAxis[] = [];
  const numericParams = new Set<string>();

  for (const key of paramKeys) {
    const isNumeric = trials.every((t) => {
      const val = t.params[key];
      if (val === undefined) return true; // missing = still numeric axis
      return !Number.isNaN(Number(val));
    });

    if (isNumeric) {
      numericParams.add(key);
      paramAxes.push({
        dim: 1 + paramAxes.length,
        name: key,
        type: "value",
      });
    } else {
      const uniqueVals = Array.from(
        new Set(
          trials
            .map((t) => t.params[key])
            .filter((v): v is string => v !== undefined),
        ),
      ).sort();
      paramAxes.push({
        dim: 1 + paramAxes.length,
        name: key,
        type: "category",
        data: uniqueVals,
      });
    }
  }

  // Objective axes
  const objAxes: ParallelAxis[] = objectives.map((obj, i) => ({
    dim: 1 + paramAxes.length + i,
    name: obj.key,
    type: "value",
  }));

  const axes = [sweepAxis, ...paramAxes, ...objAxes];

  // Build data matrix
  const trialKeys: string[] = [];
  const data: number[][] = [];

  for (const trial of trials) {
    trialKeys.push(makeTrialKey(trial.studyName, trial.trialId));
    const row: number[] = [];

    for (const axis of axes) {
      if (axis.name === "sweep") {
        row.push(uniqueSweepNames.indexOf(trial.studyName));
      } else if (axis.type === "value") {
        if (numericParams.has(axis.name)) {
          row.push(Number(trial.params[axis.name] ?? NaN));
        } else {
          // Objective value
          const val = trial.finalMetrics[axis.name];
          row.push(val !== undefined ? val : NaN);
        }
      } else {
        // Categorical param
        const val = trial.params[axis.name];
        row.push(val !== undefined ? (axis.data?.indexOf(val) ?? NaN) : NaN);
      }
    }

    data.push(row);
  }

  applyScales(axes, data, scales);

  return { axes, data, trialKeys };
}

/**
 * Apply per-axis scale transforms to built parallel data.
 * Mutates axes and data in place.
 * - Adds [scale] suffix to axis names (non-linear only)
 * - Adds tickFormatter that inverse-transforms back to original values
 * - Transforms data values for scaled axes, NaN for out-of-domain
 */
function applyScales(
  axes: ParallelAxis[],
  data: number[][],
  scales?: Map<string, AxisScale>,
): void {
  if (!scales || scales.size === 0) return;

  for (const axis of axes) {
    if (axis.type !== "value") continue;
    const scale = scales.get(axis.name);
    if (!scale || scale === "linear") continue;

    const originalName = axis.name;
    axis.name = `${originalName} [${scale}]`;
    axis.tickFormatter = (value: number) => {
      const original = inverseAxisScale(value, scale);
      return formatTickValue(original);
    };

    // Transform data values for this dimension
    const dim = axis.dim;
    for (const row of data) {
      const raw = row[dim];
      if (raw === undefined || Number.isNaN(raw)) continue;
      const transformed = applyAxisScale(raw, scale);
      row[dim] = transformed !== null ? transformed : NaN;
    }
  }
}

function formatTickValue(value: number): string {
  if (Number.isInteger(value)) return String(value);
  // Use fixed notation for small values, exponential for large/small
  if (Math.abs(value) >= 0.001 && Math.abs(value) < 10000) {
    // Up to 4 significant digits
    const str = value.toPrecision(4);
    // Strip trailing zeros after decimal point
    return str.replace(/\.?0+$/, "");
  }
  return value.toExponential(2);
}
