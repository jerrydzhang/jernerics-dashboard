import { describe, expect, it } from "vitest";

import { groupMetricsByTrial, type MetricSeries } from "./groupMetrics";

describe("groupMetricsByTrial", () => {
  it("groups metric rows into per-trial series", () => {
    const series = groupMetricsByTrial([
      { study_name: "s1", trial_id: 0, step: 0, value: 1.0 },
      { study_name: "s1", trial_id: 0, step: 1, value: 0.8 },
      { study_name: "s1", trial_id: 1, step: 0, value: 0.9 },
    ]);

    expect(series).toEqual([
      {
        studyName: "s1",
        trialId: 0,
        steps: [
          { step: 0, value: 1.0 },
          { step: 1, value: 0.8 },
        ],
      },
      {
        studyName: "s1",
        trialId: 1,
        steps: [{ step: 0, value: 0.9 }],
      },
    ] satisfies MetricSeries[]);
  });

  it("returns empty array for no rows", () => {
    expect(groupMetricsByTrial([])).toEqual([]);
  });
});
