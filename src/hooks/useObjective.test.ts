import { beforeEach, describe, expect, it } from "vitest";

import {
  clearObjective,
  getObjective,
  type ObjectiveEntry,
  setObjective,
} from "./useObjective";

describe("useObjective (pure functions)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no objective stored", () => {
    expect(getObjective("my-project")).toBeNull();
  });

  it("round-trips a single objective", () => {
    const entries: ObjectiveEntry[] = [
      { key: "final_loss", direction: "minimize" },
    ];
    setObjective("my-project", entries);
    expect(getObjective("my-project")).toEqual(entries);
  });

  it("round-trips multiple objectives", () => {
    const entries: ObjectiveEntry[] = [
      { key: "final_loss", direction: "minimize" },
      { key: "accuracy", direction: "maximize" },
      { key: "latency_ms", direction: "minimize" },
    ];
    setObjective("my-project", entries);
    expect(getObjective("my-project")).toEqual(entries);
  });

  it("stores per project", () => {
    setObjective("project-a", [{ key: "accuracy", direction: "maximize" }]);
    setObjective("project-b", [{ key: "loss", direction: "minimize" }]);
    expect(getObjective("project-a")).toEqual([
      { key: "accuracy", direction: "maximize" },
    ]);
    expect(getObjective("project-b")).toEqual([
      { key: "loss", direction: "minimize" },
    ]);
  });

  it("clears objective", () => {
    setObjective("my-project", [{ key: "loss", direction: "minimize" }]);
    clearObjective("my-project");
    expect(getObjective("my-project")).toBeNull();
  });
});
