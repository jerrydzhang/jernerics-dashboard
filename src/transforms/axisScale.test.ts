import { describe, expect, it } from "vitest";

import { applyAxisScale } from "./axisScale";

describe("applyAxisScale", () => {
  it("returns value unchanged for linear scale", () => {
    expect(applyAxisScale(2.5, "linear")).toBe(2.5);
  });

  it("computes natural log for log scale", () => {
    expect(applyAxisScale(Math.E, "log")).toBeCloseTo(1);
  });

  it("returns null for log of zero", () => {
    expect(applyAxisScale(0, "log")).toBeNull();
  });

  it("returns null for log of negative", () => {
    expect(applyAxisScale(-1, "log")).toBeNull();
  });

  it("computes symlog for positive values (same as log)", () => {
    expect(applyAxisScale(Math.E, "symlog")).toBeCloseTo(1);
  });

  it("computes symlog for negative values", () => {
    expect(applyAxisScale(-Math.E, "symlog")).toBeCloseTo(-1);
  });

  it("returns 0 for symlog of 0", () => {
    expect(applyAxisScale(0, "symlog")).toBe(0);
  });

  it("computes -log10(1-x) transform", () => {
    // -log10(1 - 0.9) = -log10(0.1) = 1
    expect(applyAxisScale(0.9, "negLogOneMinusX")).toBeCloseTo(1);
  });

  it("returns null for -log10(1-x) at x=1", () => {
    expect(applyAxisScale(1, "negLogOneMinusX")).toBeNull();
  });

  it("returns null for -log10(1-x) when x > 1", () => {
    expect(applyAxisScale(1.5, "negLogOneMinusX")).toBeNull();
  });
});
