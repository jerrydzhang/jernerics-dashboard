import { describe, expect, it } from "vitest";
import type { Trial } from "../trial";
import { computeDiff } from "./trialDiff";

const baseTrial: Trial = {
  studyName: "sweep_a",
  trialId: 0,
  params: { lr: "0.01", layers: "3" },
  finalMetrics: { loss: 0.5, acc: 0.9 },
  complete: true,
};

describe("computeDiff", () => {
  it("marks params as same when all trials share the value", () => {
    const a: Trial = { ...baseTrial, trialId: 0 };
    const b: Trial = { ...baseTrial, trialId: 1 };

    const diff = computeDiff([a, b]);

    for (const row of diff.params) {
      expect(row.isSame).toBe(true);
    }
  });

  it("marks params as different when values differ", () => {
    const a: Trial = { ...baseTrial, trialId: 0 };
    const b: Trial = {
      ...baseTrial,
      trialId: 1,
      params: { lr: "0.001", layers: "3" },
    };

    const diff = computeDiff([a, b]);
    const lrRow = diff.params.find((r) => r.key === "lr")!;
    const layersRow = diff.params.find((r) => r.key === "layers")!;

    expect(lrRow.isSame).toBe(false);
    expect(layersRow.isSame).toBe(true);
  });

  it("includes union of all param keys", () => {
    const a: Trial = { ...baseTrial, params: { lr: "0.01" } };
    const b: Trial = {
      ...baseTrial,
      trialId: 1,
      params: { weight_decay: "0.1" },
    };

    const diff = computeDiff([a, b]);
    const keys = diff.params.map((r) => r.key);

    expect(keys).toContain("lr");
    expect(keys).toContain("weight_decay");
  });

  it("treats missing param as different from present param", () => {
    const a: Trial = { ...baseTrial, params: { lr: "0.01" } };
    const b: Trial = { ...baseTrial, trialId: 1, params: {} };

    const diff = computeDiff([a, b]);
    const lrRow = diff.params.find((r) => r.key === "lr")!;

    expect(lrRow.isSame).toBe(false);
    expect(lrRow.values).toEqual(["0.01", null]);
  });

  it("includes finalMetrics in the diff", () => {
    const a: Trial = { ...baseTrial };
    const b: Trial = {
      ...baseTrial,
      trialId: 1,
      finalMetrics: { loss: 0.3, acc: 0.9 },
    };

    const diff = computeDiff([a, b]);
    const lossRow = diff.finalMetrics.find((r) => r.key === "loss")!;
    const accRow = diff.finalMetrics.find((r) => r.key === "acc")!;

    expect(lossRow.isSame).toBe(false);
    expect(accRow.isSame).toBe(true);
  });

  it("handles three trials", () => {
    const a: Trial = { ...baseTrial, params: { lr: "0.01" } };
    const b: Trial = { ...baseTrial, trialId: 1, params: { lr: "0.01" } };
    const c: Trial = { ...baseTrial, trialId: 2, params: { lr: "0.001" } };

    const diff = computeDiff([a, b, c]);
    const lrRow = diff.params.find((r) => r.key === "lr")!;

    expect(lrRow.isSame).toBe(false);
    expect(lrRow.values).toEqual(["0.01", "0.01", "0.001"]);
  });
});
