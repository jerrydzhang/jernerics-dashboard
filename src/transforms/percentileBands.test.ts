import { describe, expect, it } from "vitest";

import { computePercentileBands } from "./percentileBands";

describe("computePercentileBands", () => {
  it("returns the single series values as P50 with equal P25/P75", () => {
    const series = [
      {
        studyName: "s1",
        trialId: 0,
        steps: [
          { step: 0, value: 1.0 },
          { step: 1, value: 0.8 },
          { step: 2, value: 0.6 },
          { step: 3, value: 0.4 },
          { step: 4, value: 0.2 },
        ],
      },
    ];

    const bands = computePercentileBands(series, 25, 75);

    expect(bands).toEqual([
      { step: 0, pLow: 1.0, p50: 1.0, pHigh: 1.0 },
      { step: 1, pLow: 0.8, p50: 0.8, pHigh: 0.8 },
      { step: 2, pLow: 0.6, p50: 0.6, pHigh: 0.6 },
      { step: 3, pLow: 0.4, p50: 0.4, pHigh: 0.4 },
      { step: 4, pLow: 0.2, p50: 0.2, pHigh: 0.2 },
    ]);
  });

  it("computes P50 as midpoint of two aligned series", () => {
    const series = [
      {
        studyName: "s1",
        trialId: 0,
        steps: [
          { step: 0, value: 1.0 },
          { step: 1, value: 0.8 },
        ],
      },
      {
        studyName: "s1",
        trialId: 1,
        steps: [
          { step: 0, value: 0.5 },
          { step: 1, value: 0.4 },
        ],
      },
    ];

    const bands = computePercentileBands(series, 25, 75);

    const band0 = bands[0];
    expect(band0).toBeDefined();
    expect(band0?.step).toBe(0);
    expect(band0?.pLow).toBeCloseTo(0.625);
    expect(band0?.p50).toBeCloseTo(0.75);
    expect(band0?.pHigh).toBeCloseTo(0.875);

    const band1 = bands[1];
    expect(band1).toBeDefined();
    expect(band1?.step).toBe(1);
    expect(band1?.pLow).toBeCloseTo(0.5);
    expect(band1?.p50).toBeCloseTo(0.6);
    expect(band1?.pHigh).toBeCloseTo(0.7);
  });

  it("uses union of steps, only counting trials present at each step", () => {
    const series = [
      {
        studyName: "s1",
        trialId: 0,
        steps: [
          { step: 0, value: 1.0 },
          { step: 1, value: 0.8 },
          { step: 2, value: 0.6 },
        ],
      },
      {
        studyName: "s1",
        trialId: 1,
        steps: [{ step: 0, value: 0.5 }],
      },
    ];

    const bands = computePercentileBands(series, 25, 75);

    // 3 steps in union: 0, 1, 2
    expect(bands).toHaveLength(3);

    // Step 0: both trials present
    expect(bands[0]).toBeDefined();
    expect(bands[0]?.step).toBe(0);
    expect(bands[0]?.p50).toBeCloseTo(0.75);

    // Steps 1 and 2: only trial 0 present, so P50 = its value
    expect(bands[1]).toEqual({ step: 1, pLow: 0.8, p50: 0.8, pHigh: 0.8 });
    expect(bands[2]).toEqual({ step: 2, pLow: 0.6, p50: 0.6, pHigh: 0.6 });
  });

  it("returns empty array for no series", () => {
    expect(computePercentileBands([], 25, 75)).toEqual([]);
  });
});
