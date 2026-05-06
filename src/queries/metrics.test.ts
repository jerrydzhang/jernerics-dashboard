import { describe, expect, it } from "vitest";

import {
  listFinalMetricKeys,
  listFinalMetrics,
  listMetricData,
  listMetricKeys,
} from "./metrics";
import { listObjectiveValues } from "./trialTable";

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

  describe("listFinalMetricKeys", () => {
    it("returns SQL for distinct metric keys where step is NULL", () => {
      const sql = listFinalMetricKeys("project", ["study1", "study2"]);
      expect(sql).toContain("SELECT DISTINCT key");
      expect(sql).toContain("metrics");
      expect(sql).toContain("step IS NULL");
      expect(sql).toContain("study1");
      expect(sql).toContain("study2");
    });

    it("returns empty query when no studies", () => {
      const sql = listFinalMetricKeys("project", []);
      expect(sql).toContain("LIMIT 0");
    });
  });

  describe("listFinalMetrics", () => {
    it("returns SQL for per-trial final metric values", () => {
      const sql = listFinalMetrics("project", ["study1"]);
      expect(sql).toContain("SELECT study_name, trial_id, key, value");
      expect(sql).toContain("metrics");
      expect(sql).toContain("step IS NULL");
      expect(sql).toContain("study1");
    });

    it("returns empty query when no studies", () => {
      const sql = listFinalMetrics("project", []);
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

describe("query library: trialTable", () => {
  describe("listObjectiveValues", () => {
    it("queries metrics table with step IS NULL", () => {
      const sql = listObjectiveValues("project", ["study1"], "accuracy");
      expect(sql).toContain("FROM metrics");
      expect(sql).toContain("step IS NULL");
      expect(sql).toContain("accuracy");
      expect(sql).not.toContain("FROM results");
      expect(sql).not.toContain("CAST");
    });

    it("returns empty query when no studies", () => {
      const sql = listObjectiveValues("project", [], "accuracy");
      expect(sql).toContain("LIMIT 0");
    });
  });
});
