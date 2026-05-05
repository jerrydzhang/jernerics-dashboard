import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(cleanup);

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../transforms/groupTrials";
import { ParallelCoordinates } from "./ParallelCoordinates";

const objectives: ObjectiveEntry[] = [{ key: "loss", direction: "minimize" }];

const trials: Trial[] = [
  {
    studyName: "sweep_a",
    trialId: 0,
    params: { lr: "0.01", layers: "3" },
    results: { loss: 0.5 },
    complete: true,
  },
  {
    studyName: "sweep_a",
    trialId: 1,
    params: { lr: "0.001", layers: "2" },
    results: { loss: 0.3 },
    complete: true,
  },
];

describe("ParallelCoordinates", () => {
  it("renders without crashing with trials and objectives", () => {
    const { container } = render(
      <ParallelCoordinates
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    // Should render an ECharts container div
    expect(container.querySelector("div[_echarts_instance_]")).toBeTruthy();
  });
});
