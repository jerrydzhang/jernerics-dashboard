import { describe, expect, it } from "vitest";

import { listMetricData, listMetricKeys } from "./metrics";

describe("query library: metrics", () => {
  describe("listMetricKeys", () => {
    it("returns SQL for distinct metric keys", () => {
      const sql = listMetricKeys("project", ["study1", "study2"]);
      expect(sql).toContain("SELECT DISTINCT key");
      expect(sql).toContain("metrics");
      expect(sql).toContain("project");
      expect(sql).toContain("study1");
      expect(sql).toContain("study2");
    });

    it("returns empty query when no studies", () => {
      const sql = listMetricKeys("project", []);
      expect(sql).toContain("LIMIT 0");
    });
  });

  describe("listMetricData", () => {
    it("returns SQL for metric step data", () => {
      const sql = listMetricData("project", ["study1"], "training_loss");
      expect(sql).toContain("step");
      expect(sql).toContain("value");
      expect(sql).toContain("training_loss");
      expect(sql).toContain("study1");
    });
  });
});
