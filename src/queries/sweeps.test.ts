import { describe, expect, it } from "vitest";

import { listSweepMeta, listSweeps } from "./sweeps";

describe("query library: sweeps", () => {
  describe("listProjects", () => {
    it("returns SQL that selects distinct projects", async () => {
      const { listProjects } = await import("./sweeps");
      const sql = listProjects();
      expect(sql).toContain("SELECT DISTINCT project");
      expect(sql).toContain("FROM params");
    });
  });

  describe("listSweeps", () => {
    it("returns SQL that selects sweeps for a project with parsed metadata", () => {
      const sql = listSweeps("image-classification");
      expect(sql).toContain("image-classification");
      expect(sql).toContain("study_name");
      expect(sql).toContain("GROUP BY");
    });

    it("escapes single quotes in project name", () => {
      const sql = listSweeps("test'project");
      expect(sql).toContain("test''project");
    });
  });

  describe("listSweepMeta", () => {
    it("returns SQL for sweep metadata", () => {
      const sql = listSweepMeta("image-classification", "some_study");
      expect(sql).toContain("git_hash");
      expect(sql).toContain("sweep_meta");
      expect(sql).toContain("image-classification");
    });
  });
});
