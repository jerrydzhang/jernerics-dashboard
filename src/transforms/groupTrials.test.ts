import { describe, expect, it } from "vitest";

import { groupTrials, type Trial } from "./groupTrials";

describe("groupTrials", () => {
  it("groups flat rows into trial objects with params and results", () => {
    const trials = groupTrials(
      // params rows
      [
        { study_name: "sweep_a", trial_id: 0, key: "lr", value: "0.01" },
        { study_name: "sweep_a", trial_id: 0, key: "layers", value: "3" },
        { study_name: "sweep_a", trial_id: 1, key: "lr", value: "0.001" },
      ],
      // results rows
      [
        { study_name: "sweep_a", trial_id: 0, key: "loss", value: 0.5 },
        { study_name: "sweep_a", trial_id: 0, key: "acc", value: 0.9 },
        { study_name: "sweep_a", trial_id: 1, key: "loss", value: 0.3 },
      ],
      // status rows
      [
        { study_name: "sweep_a", trial_id: 0, status: "done" },
        { study_name: "sweep_a", trial_id: 1, status: "unknown" },
      ],
    );

    expect(trials).toEqual([
      {
        studyName: "sweep_a",
        trialId: 0,
        params: { lr: "0.01", layers: "3" },
        results: { loss: 0.5, acc: 0.9 },
        complete: true,
      },
      {
        studyName: "sweep_a",
        trialId: 1,
        params: { lr: "0.001" },
        results: { loss: 0.3 },
        complete: false,
      },
    ] satisfies Trial[]);
  });

  it("returns empty array for empty inputs", () => {
    expect(groupTrials([], [], [])).toEqual([]);
  });

  it("handles trials with no results", () => {
    const trials = groupTrials(
      [{ study_name: "s1", trial_id: 0, key: "lr", value: "0.1" }],
      [],
      [{ study_name: "s1", trial_id: 0, status: "unknown" }],
    );
    expect(trials).toEqual([
      {
        studyName: "s1",
        trialId: 0,
        params: { lr: "0.1" },
        results: {},
        complete: false,
      },
    ]);
  });
});
