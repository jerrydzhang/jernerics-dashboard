import { describe, expect, it } from "vitest";

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../trial";
import { computeParetoSteps } from "./paretoSteps";

describe("computeParetoSteps", () => {
  it("returns nondominated points sorted by x-axis objective", () => {
    const objectives: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "latency", direction: "minimize" },
    ];

    const trials: Trial[] = [
      // Nondominated
      {
        studyName: "s",
        trialId: 0,
        params: {},
        finalMetrics: { loss: 0.5, latency: 100 },
        complete: true,
      },
      // Nondominated (best loss)
      {
        studyName: "s",
        trialId: 1,
        params: {},
        finalMetrics: { loss: 0.3, latency: 150 },
        complete: true,
      },
      // Nondominated (best latency)
      {
        studyName: "s",
        trialId: 2,
        params: {},
        finalMetrics: { loss: 0.8, latency: 80 },
        complete: true,
      },
      // Dominated by T1 (worse on both)
      {
        studyName: "s",
        trialId: 3,
        params: {},
        finalMetrics: { loss: 0.7, latency: 200 },
        complete: true,
      },
    ];

    const steps = computeParetoSteps(
      trials,
      objectives as [ObjectiveEntry, ObjectiveEntry],
    );

    // Sorted by first objective (loss): T1, T0, T2
    expect(steps).toEqual([
      { x: 0.3, y: 150, key: "s\u00001" },
      { x: 0.5, y: 100, key: "s\u00000" },
      { x: 0.8, y: 80, key: "s\u00002" },
    ]);
  });

  it("breaks ties by y-value", () => {
    const objectives: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "acc", direction: "maximize" },
    ];

    const trials: Trial[] = [
      {
        studyName: "s",
        trialId: 0,
        params: {},
        finalMetrics: { loss: 0.3, acc: 0.9 },
        complete: true,
      },
      {
        studyName: "s",
        trialId: 1,
        params: {},
        finalMetrics: { loss: 0.3, acc: 0.8 },
        complete: true,
      },
    ];

    const steps = computeParetoSteps(
      trials,
      objectives as [ObjectiveEntry, ObjectiveEntry],
    );

    // T1 dominates T0? No — same loss, but T0 has better acc (0.9 > 0.8).
    // T0 dominates T1? Same loss (at least as good), strictly better acc. Yes.
    // So only T0 survives.
    expect(steps).toEqual([{ x: 0.3, y: 0.9, key: "s\u00000" }]);
  });

  it("returns empty for no trials", () => {
    const objectives: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "acc", direction: "maximize" },
    ];
    expect(
      computeParetoSteps([], objectives as [ObjectiveEntry, ObjectiveEntry]),
    ).toEqual([]);
  });

  it("returns empty when no trials have values for both objectives", () => {
    const objectives: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "acc", direction: "maximize" },
    ];
    const trials: Trial[] = [
      {
        studyName: "s",
        trialId: 0,
        params: {},
        finalMetrics: { loss: 0.5 },
        complete: true,
      },
    ];
    expect(
      computeParetoSteps(
        trials,
        objectives as [ObjectiveEntry, ObjectiveEntry],
      ),
    ).toEqual([]);
  });
});
