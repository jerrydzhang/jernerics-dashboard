import { describe, expect, it } from "vitest";

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../trial";
import type { AxisScale } from "./axisScale";
import { buildParallelData } from "./parallelData";

const objectives: ObjectiveEntry[] = [{ key: "loss", direction: "minimize" }];

function makeTrial(overrides: Partial<Trial> & { trialId: number }): Trial {
  return {
    studyName: "sweep_a",
    params: {},
    finalMetrics: {},
    complete: true,
    ...overrides,
  };
}

describe("buildParallelData", () => {
  it("classifies numeric params as value axes and adds objectives + study_name axes", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "0.01", layers: "3" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { lr: "0.001", layers: "2" },
        finalMetrics: { loss: 0.3 },
      }),
    ];
    const { axes, data, trialKeys } = buildParallelData(trials, objectives);

    const lrAxis = axes.find((a) => a.name === "lr");
    expect(lrAxis).toBeDefined();
    expect(lrAxis?.type).toBe("value");
    // dim is 1+ because sweep axis is dim 0
    expect(lrAxis?.dim).toBeGreaterThanOrEqual(1);

    const layersAxis = axes.find((a) => a.name === "layers");
    expect(layersAxis).toBeDefined();
    expect(layersAxis?.type).toBe("value");
    expect(layersAxis?.dim).toBeGreaterThanOrEqual(1);

    const lossAxis = axes.find((a) => a.name === "loss");
    expect(lossAxis).toBeDefined();
    expect(lossAxis?.type).toBe("value");

    // Sweep axis is first (dim 0)
    const sweepAxis = axes.find((a) => a.name === "sweep");
    expect(sweepAxis).toBeDefined();
    expect(sweepAxis?.type).toBe("category");
    expect(sweepAxis?.dim).toBe(0);

    expect(data).toHaveLength(2);
    expect(trialKeys).toHaveLength(2);
    expect(trialKeys[0]).toBe("sweep_a\x000");
    expect(trialKeys[1]).toBe("sweep_a\x001");
  });

  it("classifies string params as category axes with unique values", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { optimizer: "adam", lr: "0.01" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { optimizer: "sgd", lr: "0.001" },
        finalMetrics: { loss: 0.3 },
      }),
      makeTrial({
        trialId: 2,
        params: { optimizer: "adam", lr: "0.1" },
        finalMetrics: { loss: 0.4 },
      }),
    ];

    const { axes } = buildParallelData(trials, objectives);

    const optAxis = axes.find((a) => a.name === "optimizer");
    expect(optAxis).toBeDefined();
    expect(optAxis?.type).toBe("category");
    expect(optAxis?.data).toEqual(["adam", "sgd"]);

    const lrAxis = axes.find((a) => a.name === "lr");
    expect(lrAxis?.type).toBe("value");
  });

  it("treats boolean-like params as categorical", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { use_bn: "true", lr: "0.01" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { use_bn: "false", lr: "0.001" },
        finalMetrics: { loss: 0.3 },
      }),
    ];

    const { axes } = buildParallelData(trials, objectives);

    const bnAxis = axes.find((a) => a.name === "use_bn");
    expect(bnAxis?.type).toBe("category");
    expect(bnAxis?.data).toEqual(["false", "true"]);
  });

  it("handles trials with missing params", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "0.01", dropout: "0.5" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { lr: "0.001" },
        finalMetrics: { loss: 0.3 },
      }),
    ];

    const { axes, data } = buildParallelData(trials, objectives);

    const dropoutAxis = axes.find((a) => a.name === "dropout");
    expect(dropoutAxis).toBeDefined();

    expect(data).toHaveLength(2);
    const dropoutDim = dropoutAxis?.dim ?? -1;
    expect(data[0]?.[dropoutDim]).toBe(0.5);
    expect(data[1]?.[dropoutDim]).toBeNaN();
  });

  it("applies log scale to a numeric axis when scales map is provided", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "10" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { lr: "1" },
        finalMetrics: { loss: 0.3 },
      }),
    ];

    const scales = new Map<string, AxisScale>();
    scales.set("lr", "log");

    const { axes, data } = buildParallelData(trials, objectives, scales);

    const lrAxis = axes.find((a) => a.name === "lr [log]");
    expect(lrAxis).toBeDefined();

    const lrDim = lrAxis?.dim ?? -1;
    // log(10) ≈ 2.302, log(1) = 0
    expect(data[0]?.[lrDim]).toBeCloseTo(Math.log(10));
    expect(data[1]?.[lrDim]).toBeCloseTo(0);
  });

  it("produces NaN for out-of-domain values on log-scaled axis", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "0.01" },
        finalMetrics: { loss: 0.5 },
      }),
      makeTrial({
        trialId: 1,
        params: { lr: "0" },
        finalMetrics: { loss: 0.3 },
      }),
    ];

    const scales = new Map<string, AxisScale>();
    scales.set("lr", "log");

    const { data } = buildParallelData(trials, objectives, scales);

    // log(0) → NaN
    expect(data[1]?.[1]).toBeNaN();
  });

  it("does not add suffix to axis name when scale is linear", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "0.01" },
        finalMetrics: { loss: 0.5 },
      }),
    ];

    const scales = new Map<string, AxisScale>();
    scales.set("lr", "linear");

    const { axes } = buildParallelData(trials, objectives, scales);

    const lrAxis = axes.find((a) => a.name === "lr");
    expect(lrAxis).toBeDefined();
    expect(axes.find((a) => a.name.includes("["))).toBeUndefined();
  });

  it("includes tickFormatter that inverse-transforms axis values", () => {
    const trials: Trial[] = [
      makeTrial({
        trialId: 0,
        params: { lr: "10" },
        finalMetrics: { loss: 0.5 },
      }),
    ];

    const scales = new Map<string, AxisScale>();
    scales.set("lr", "log");

    const { axes } = buildParallelData(trials, objectives, scales);

    const lrAxis = axes.find((a) => a.name === "lr [log]");
    expect(lrAxis?.tickFormatter).toBeDefined();
    // log(10) ≈ 2.302, inverse is exp(2.302) ≈ 10
    const formatted = lrAxis?.tickFormatter?.(Math.log(10));
    expect(Number(formatted)).toBeCloseTo(10, 1);
  });
});
