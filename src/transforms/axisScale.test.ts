import { describe, expect, it } from "vitest";

import { applyAxisScale, inverseAxisScale } from "./axisScale";

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

  it("computes log1p for positive values", () => {
    expect(applyAxisScale(Math.E - 1, "log1p")).toBeCloseTo(1);
  });

  it("returns 0 for log1p of 0", () => {
    expect(applyAxisScale(0, "log1p")).toBe(0);
  });

  it("returns null for log1p of negative", () => {
    expect(applyAxisScale(-1, "log1p")).toBeNull();
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

describe("inverseAxisScale", () => {
  it("returns value unchanged for linear", () => {
    expect(inverseAxisScale(2.5, "linear")).toBe(2.5);
  });

  it("inverts log: exp(1) = e", () => {
    expect(inverseAxisScale(1, "log")).toBeCloseTo(Math.E);
  });

  it("inverts log1p: expm1(1)", () => {
    expect(inverseAxisScale(1, "log1p")).toBeCloseTo(Math.E - 1);
  });

  it("inverts symlog for positive", () => {
    expect(inverseAxisScale(1, "symlog")).toBeCloseTo(Math.E);
  });

  it("inverts symlog for negative", () => {
    expect(inverseAxisScale(-1, "symlog")).toBeCloseTo(-Math.E);
  });

  it("inverts symlog at 0", () => {
    expect(inverseAxisScale(0, "symlog")).toBe(0);
  });

  it("inverts negLogOneMinusX", () => {
    // forward: -log10(1 - 0.9) = 1 → inverse: 1 - 10^(-1) = 0.9
    expect(inverseAxisScale(1, "negLogOneMinusX")).toBeCloseTo(0.9);
  });
});
