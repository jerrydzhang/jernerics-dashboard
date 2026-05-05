import { beforeEach, describe, expect, it } from "vitest";

import {
  clearObjective,
  getObjective,
  type ObjectiveConfig,
  setObjective,
} from "./useObjective";

describe("useObjective", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no objective stored", () => {
    expect(getObjective("my-project")).toBeNull();
  });

  it("round-trips primary-only objective through localStorage", () => {
    const config: ObjectiveConfig = {
      primary: { key: "final_loss", direction: "minimize" },
      secondary: null,
    };
    setObjective("my-project", config);
    expect(getObjective("my-project")).toEqual(config);
  });

  it("round-trips primary + secondary objective through localStorage", () => {
    const config: ObjectiveConfig = {
      primary: { key: "final_loss", direction: "minimize" },
      secondary: { key: "accuracy", direction: "maximize" },
    };
    setObjective("my-project", config);
    expect(getObjective("my-project")).toEqual(config);
  });

  it("stores per project", () => {
    setObjective("project-a", {
      primary: { key: "accuracy", direction: "maximize" },
      secondary: null,
    });
    setObjective("project-b", {
      primary: { key: "loss", direction: "minimize" },
      secondary: null,
    });
    expect(getObjective("project-a")?.primary.key).toBe("accuracy");
    expect(getObjective("project-b")?.primary.key).toBe("loss");
  });

  it("clears objective", () => {
    setObjective("my-project", {
      primary: { key: "loss", direction: "minimize" },
      secondary: null,
    });
    clearObjective("my-project");
    expect(getObjective("my-project")).toBeNull();
  });
});
