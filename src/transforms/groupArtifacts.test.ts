import { describe, expect, it } from "vitest";

import { groupArtifactsByTrial, type TrialArtifacts } from "./groupArtifacts";

describe("groupArtifactsByTrial", () => {
  it("groups artifact rows by trial", () => {
    const result = groupArtifactsByTrial([
      {
        study_name: "s1",
        trial_id: 0,
        key: "confusion_matrix",
        filename: "cm.png",
      },
      {
        study_name: "s1",
        trial_id: 0,
        key: "predictions",
        filename: "preds.csv",
      },
      {
        study_name: "s1",
        trial_id: 1,
        key: "confusion_matrix",
        filename: "cm.png",
      },
    ]);

    expect(result).toEqual([
      {
        studyName: "s1",
        trialId: 0,
        artifacts: [
          { key: "confusion_matrix", filename: "cm.png" },
          { key: "predictions", filename: "preds.csv" },
        ],
      },
      {
        studyName: "s1",
        trialId: 1,
        artifacts: [{ key: "confusion_matrix", filename: "cm.png" }],
      },
    ] satisfies TrialArtifacts[]);
  });

  it("returns empty array for no rows", () => {
    expect(groupArtifactsByTrial([])).toEqual([]);
  });
});
