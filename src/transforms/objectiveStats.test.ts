import { describe, expect, it } from "bun:test";
import type { Trial } from "./groupTrials";
import { computeObjectiveStats } from "./objectiveStats";

const trial = (
  id: number,
  results: Record<string, number>,
  complete = true,
): Trial => ({
  studyName: "test",
  trialId: id,
  params: {},
  results,
  complete,
});

describe("computeObjectiveStats", () => {
  it("computes best/median/worst for maximize", () => {
    const trials = [
      trial(1, { acc: 0.8 }),
      trial(2, { acc: 0.9 }),
      trial(3, { acc: 0.7 }),
      trial(4, { acc: 1.0 }),
      trial(5, { acc: 0.85 }),
    ];

    const stats = computeObjectiveStats(trials, "acc", "maximize");

    expect(stats.best).toBe(1.0);
    expect(stats.median).toBe(0.85);
    expect(stats.worst).toBe(0.7);
    expect(stats.count).toBe(5);
    expect(stats.incompleteCount).toBe(0);
  });

  it("computes best/median/worst for minimize", () => {
    const trials = [
      trial(1, { loss: 0.5 }),
      trial(2, { loss: 0.1 }),
      trial(3, { loss: 0.3 }),
    ];

    const stats = computeObjectiveStats(trials, "loss", "minimize");

    expect(stats.best).toBe(0.1);
    expect(stats.worst).toBe(0.5);
    expect(stats.median).toBe(0.3);
  });

  it("excludes trials missing the objective key", () => {
    const trials = [
      trial(1, { acc: 0.9 }),
      trial(2, { other: 1.0 }),
      trial(3, { acc: 0.7 }),
    ];

    const stats = computeObjectiveStats(trials, "acc", "maximize");

    expect(stats.best).toBe(0.9);
    expect(stats.count).toBe(2);
  });

  it("counts incomplete trials that have the key", () => {
    const trials = [
      trial(1, { acc: 0.9 }),
      trial(2, { acc: 0.8 }, false),
      trial(3, { acc: 0.7 }, false),
      trial(4, { other: 1.0 }, false),
    ];

    const stats = computeObjectiveStats(trials, "acc", "maximize");

    expect(stats.count).toBe(3);
    expect(stats.incompleteCount).toBe(2); // trial 4 excluded (no key)
  });

  it("produces histogram bins spanning the value range", () => {
    const values = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
    const trials = values.map((v, i) => trial(i, { acc: v }));

    const stats = computeObjectiveStats(trials, "acc", "maximize");

    // 11 values across [0, 1] with ~15 bins → most bins have 0 or 1
    expect(stats.histogram.length).toBeGreaterThan(0);
    expect(stats.histogram.length).toBeLessThanOrEqual(20);
    // sum of bins equals count
    expect(stats.histogram.reduce((a, b) => a + b, 0)).toBe(11);
  });

  it("maps trial keys to histogram bins", () => {
    const trials = [
      trial(1, { acc: 0.1 }),
      trial(2, { acc: 0.5 }),
      trial(3, { acc: 0.9 }),
    ];

    const stats = computeObjectiveStats(trials, "acc", "maximize");

    expect(stats.binTrialKeys.length).toBe(stats.histogram.length);
    // every trial key appears in exactly one bin
    const allKeys = stats.binTrialKeys.flat();
    expect(allKeys.length).toBe(3);
    expect(allKeys).toContain("test\u00001");
    expect(allKeys).toContain("test\u00002");
    expect(allKeys).toContain("test\u00003");
  });

  it("tracks which trial has the best value", () => {
    const trials = [
      trial(1, { acc: 0.5 }),
      trial(2, { acc: 0.9 }),
      trial(3, { acc: 0.7 }),
    ];

    const maxStats = computeObjectiveStats(trials, "acc", "maximize");
    expect(maxStats.bestTrialKey).toBe("test\u00002");

    const minStats = computeObjectiveStats(trials, "acc", "minimize");
    expect(minStats.bestTrialKey).toBe("test\u00001");
  });
});
