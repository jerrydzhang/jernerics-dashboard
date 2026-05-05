import { describe, expect, it } from "vitest";

import { parseStudyName } from "./studyName";

describe("parseStudyName", () => {
  it("parses a study name into project, config stem, and date", () => {
    const result = parseStudyName(
      "image-classification_resnet50_1700000000000000000",
    );
    expect(result).toEqual({
      project: "image-classification",
      configStem: "resnet50",
      timestampNs: 1700000000000000000,
      startedDate: new Date("2023-11-14T22:13:20.000Z"),
    });
  });

  it("parses a study name with hyphens in project and config", () => {
    const result = parseStudyName(
      "embedding-search_hnsw-sweep_1700000000000000000",
    );
    expect(result).toEqual({
      project: "embedding-search",
      configStem: "hnsw-sweep",
      timestampNs: 1700000000000000000,
      startedDate: new Date("2023-11-14T22:13:20.000Z"),
    });
  });

  it("returns null for a malformed study name", () => {
    expect(parseStudyName("no-underscores")).toBeNull();
    expect(parseStudyName("")).toBeNull();
  });
});
