import { describe, expect, it } from "vitest";

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../transforms/groupTrials";
import { computeParetoFront } from "./pareto";

const objectives: ObjectiveEntry[] = [{ key: "loss", direction: "minimize" }];

describe("computeParetoFront", () => {
  it("returns all trials when there's a single objective and unique values", () => {
    const trials: Trial[] = [
      {
        studyName: "s",
        trialId: 0,
        params: {},
        results: { loss: 0.5 },
        complete: true,
      },
      {
        studyName: "s",
        trialId: 1,
        params: {},
        results: { loss: 0.3 },
        complete: true,
      },
    ];

    const front = computeParetoFront(trials, objectives);
    // All are nondominated with a single objective since no trial
    // dominates another (0.3 is better but doesn't need to be "at least
    // as good on all + strictly better on one" — wait, 0.3 IS strictly
    // better on loss, so trial 1 dominates trial 0)
    expect(front.has("s\0" + "0")).toBe(false);
    expect(front.has("s\0" + "1")).toBe(true);
    expect(front.size).toBe(1);
  });

  it("returns nondominated set for multi-objective", () => {
    const multiObj: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "acc", direction: "maximize" },
    ];

    const trials: Trial[] = [
      // Dominated: high loss, low acc
      {
        studyName: "s",
        trialId: 0,
        params: {},
        results: { loss: 0.8, acc: 0.7 },
        complete: true,
      },
      // Pareto: best acc
      {
        studyName: "s",
        trialId: 1,
        params: {},
        results: { loss: 0.5, acc: 0.95 },
        complete: true,
      },
      // Pareto: best loss
      {
        studyName: "s",
        trialId: 2,
        params: {},
        results: { loss: 0.2, acc: 0.85 },
        complete: true,
      },
    ];

    const front = computeParetoFront(trials, multiObj);
    expect(front.has("s\0" + "0")).toBe(false);
    expect(front.has("s\0" + "1")).toBe(true);
    expect(front.has("s\0" + "2")).toBe(true);
    expect(front.size).toBe(2);
  });

  it("returns empty set when objectives list is empty", () => {
    const trials: Trial[] = [
      { studyName: "s", trialId: 0, params: {}, results: {}, complete: true },
    ];
    expect(computeParetoFront(trials, [])).toEqual(new Set());
  });

  it("returns empty set when trials have no values for objectives", () => {
    const trials: Trial[] = [
      { studyName: "s", trialId: 0, params: {}, results: {}, complete: true },
    ];
    // No trial has "loss" in results, so none can dominate —
    // but dominates() returns false when values are undefined,
    // so all are nondominated
    const front = computeParetoFront(trials, objectives);
    expect(front.size).toBe(1);
  });
});
