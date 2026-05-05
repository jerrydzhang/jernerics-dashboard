import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../transforms/groupTrials";
import { TrialTable } from "./TrialTable";

const trials: Trial[] = [
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
    params: { lr: "0.001", layers: "2" },
    results: { loss: 0.3, acc: 0.95 },
    complete: false,
  },
];

const objectives: ObjectiveEntry[] = [{ key: "loss", direction: "minimize" }];

function dataRows() {
  return screen.getAllByRole("row").slice(1);
}

describe("TrialTable", () => {
  it("renders a row per trial with trial ID, objectives, and param columns", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("0")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("0.5")).toBeTruthy();
    expect(screen.getByText("0.3")).toBeTruthy();
    expect(screen.getByText("0.01")).toBeTruthy();
    expect(screen.getByText("0.001")).toBeTruthy();
  });

  it("sorts rows when a column header is clicked", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    const lossHeader = screen
      .getAllByText("loss")
      .find((el) => el.tagName === "TH")!;
    fireEvent.click(lossHeader);
    expect(dataRows()[0]?.textContent).toContain("0.3");
    expect(dataRows()[1]?.textContent).toContain("0.5");

    fireEvent.click(lossHeader);
    expect(dataRows()[0]?.textContent).toContain("0.5");
    expect(dataRows()[1]?.textContent).toContain("0.3");
  });

  it("shows sort direction indicator in the active column header", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    const lossHeader = screen
      .getAllByText("loss")
      .find((el) => el.tagName === "TH")!;

    expect(lossHeader.textContent).not.toContain("↑");
    expect(lossHeader.textContent).not.toContain("↓");

    fireEvent.click(lossHeader);
    const headerAsc = screen
      .getAllByText((text) => text.includes("loss"))
      .find((el) => el.tagName === "TH")!;
    expect(headerAsc.textContent).toContain("↑");

    fireEvent.click(headerAsc);
    const headerDesc = screen
      .getAllByText((text) => text.includes("loss"))
      .find((el) => el.tagName === "TH")!;
    expect(headerDesc.textContent).toContain("↓");
  });

  it("filters rows by text search across all columns", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    const searchInput = screen.getByPlaceholderText("Filter trials...");
    fireEvent.change(searchInput, { target: { value: "0.001" } });

    const rows = dataRows();
    expect(rows.length).toBe(1);
    expect(rows[0]?.textContent).toContain("0.001");
  });

  it("fires onSelect with toggled trial key when a row is clicked", () => {
    const onSelect = vi.fn();
    const selectedIds = new Set<string>();

    const { rerender } = render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(dataRows()[0]!);

    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledWith = onSelect.mock.calls[0]?.[0] as Set<string>;
    expect(calledWith.size).toBe(1);
    expect(Array.from(calledWith)[0]).toBe("sweep_a\0" + "0");

    const nextSelected = new Set(["sweep_a\0" + "0"]);
    rerender(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={nextSelected}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(dataRows()[0]!);
    const secondCall = onSelect.mock.calls[1]?.[0] as Set<string>;
    expect(secondCall.size).toBe(0);
  });

  it("filters by trial status: done or incomplete", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    expect(dataRows().length).toBe(2);

    fireEvent.click(screen.getByText("Done"));
    expect(dataRows().length).toBe(1);
    expect(dataRows()[0]?.textContent).toContain("0.5");

    fireEvent.click(screen.getByText("Incomplete"));
    expect(dataRows().length).toBe(1);
    expect(dataRows()[0]?.textContent).toContain("0.3");

    fireEvent.click(screen.getByText("All"));
    expect(dataRows().length).toBe(2);
  });

  it("filters to Pareto-optimal trials when toggle is clicked", () => {
    const multiObj: ObjectiveEntry[] = [
      { key: "loss", direction: "minimize" },
      { key: "acc", direction: "maximize" },
    ];

    const localTrials: Trial[] = [
      {
        studyName: "s",
        trialId: 0,
        params: {},
        results: { loss: 0.8, acc: 0.7 },
        complete: true,
      },
      {
        studyName: "s",
        trialId: 1,
        params: {},
        results: { loss: 0.3, acc: 0.95 },
        complete: true,
      },
    ];

    render(
      <TrialTable
        trials={localTrials}
        objectives={multiObj}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    expect(dataRows().length).toBe(2);

    fireEvent.click(screen.getByText("Pareto"));
    expect(dataRows().length).toBe(1);
    expect(dataRows()[0]?.textContent).toContain("0.3");
  });

  it("shift-click selects a range from last clicked row", () => {
    const onSelect = vi.fn();
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(dataRows()[0]!);
    let call = onSelect.mock.calls[0]?.[0] as Set<string>;
    expect(call.size).toBe(1);

    fireEvent.click(dataRows()[1]!, { shiftKey: true });
    call = onSelect.mock.calls[1]?.[0] as Set<string>;
    expect(call.size).toBe(2);
  });

  it("shift-click deselects range when anchor click was a deselect", () => {
    const manyTrials: Trial[] = [0, 1, 2, 3, 4].map((i) => ({
      studyName: "s",
      trialId: i,
      params: {},
      results: { loss: i * 0.1 },
      complete: true,
    }));
    const onSelect = vi.fn();
    const selectedIds = new Set(["s\0" + "1", "s\0" + "2", "s\0" + "3"]);
    const { rerender } = render(
      <TrialTable
        trials={manyTrials}
        objectives={objectives}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />,
    );

    // Click row 1 to deselect it — anchor mode = deselect
    fireEvent.click(dataRows()[1]!);
    let call = onSelect.mock.calls[0]?.[0] as Set<string>;
    expect(call.has("s\0" + "1")).toBe(false);

    rerender(
      <TrialTable
        trials={manyTrials}
        objectives={objectives}
        selectedIds={call}
        onSelect={onSelect}
      />,
    );

    // Shift-click row 3 — deselects range 1..3
    fireEvent.click(dataRows()[3]!, { shiftKey: true });
    call = onSelect.mock.calls[1]?.[0] as Set<string>;
    expect(call.has("s\0" + "1")).toBe(false);
    expect(call.has("s\0" + "2")).toBe(false);
    expect(call.has("s\0" + "3")).toBe(false);
  });

  it("shift-click selects range across multiple rows", () => {
    const manyTrials: Trial[] = [0, 1, 2, 3, 4].map((i) => ({
      studyName: "s",
      trialId: i,
      params: {},
      results: { loss: i * 0.1 },
      complete: true,
    }));
    const onSelect = vi.fn();
    const { rerender } = render(
      <TrialTable
        trials={manyTrials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={onSelect}
      />,
    );

    // Click row 1 — anchor
    fireEvent.click(dataRows()[1]!);
    rerender(
      <TrialTable
        trials={manyTrials}
        objectives={objectives}
        selectedIds={onSelect.mock.calls[0]?.[0] as Set<string>}
        onSelect={onSelect}
      />,
    );

    // Shift-click row 3 — selects rows 1, 2, 3
    fireEvent.click(dataRows()[3]!, { shiftKey: true });
    const call = onSelect.mock.calls[1]?.[0] as Set<string>;
    expect(call.size).toBe(3);
    expect(call.has("s\0" + "1")).toBe(true);
    expect(call.has("s\0" + "2")).toBe(true);
    expect(call.has("s\0" + "3")).toBe(true);
  });

  it("shows status indicator for incomplete trials", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    const rows = dataRows();
    expect(rows[0]?.textContent).not.toContain("incomplete");
    expect(rows[1]?.textContent).toContain("incomplete");
  });

  it("has select all / select none toggle", () => {
    const onSelect = vi.fn();
    const selectedIds = new Set<string>();
    const { rerender } = render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={selectedIds}
        onSelect={onSelect}
      />,
    );

    // Click "Select all" — should select both trials
    fireEvent.click(screen.getByText("Select all"));
    const allSelected = onSelect.mock.calls[0]?.[0] as Set<string>;
    expect(allSelected.size).toBe(2);

    // Rerender with all selected — button should say "Select none"
    rerender(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={allSelected}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("Select none"));
    const noneSelected = onSelect.mock.calls[1]?.[0] as Set<string>;
    expect(noneSelected.size).toBe(0);
  });

  it("can toggle column visibility", () => {
    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    // All columns visible by default
    expect(
      screen.getAllByText("lr").find((el) => el.tagName === "TH"),
    ).toBeTruthy();

    // Hide lr column
    fireEvent.click(screen.getByText("Columns"));
    // Find the lr item inside the columns dropdown (it's a button inside a li)
    const lrButtons = screen.getAllByText("lr");
    const lrBtn = lrButtons.find((el) => el.tagName === "BUTTON")!;
    fireEvent.click(lrBtn);

    // lr header should no longer appear as a column
    const thElements = screen.getAllByRole("columnheader");
    expect(
      thElements.find((th) => th.textContent?.includes("lr")),
    ).toBeUndefined();
  });

  it("has a copy button that puts TSV on the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <TrialTable
        trials={trials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    fireEvent.click(screen.getByText("Copy"));
    expect(writeText).toHaveBeenCalledTimes(1);
    const tsv = writeText.mock.calls[0]?.[0] as string;
    // Header row
    expect(tsv.split("\n")[0]).toBe("Trial\tloss\tlayers\tlr");
    // Data rows
    expect(tsv.split("\n")[1]).toBe("0\t0.5\t3\t0.01");
    expect(tsv.split("\n")[2]).toBe("1\t0.3\t2\t0.001");
  });

  it("sorts string param columns alphabetically", () => {
    const catTrials: Trial[] = [
      {
        studyName: "s",
        trialId: 0,
        params: { optimizer: "sgd" },
        results: { loss: 0.5 },
        complete: true,
      },
      {
        studyName: "s",
        trialId: 1,
        params: { optimizer: "adam" },
        results: { loss: 0.3 },
        complete: true,
      },
      {
        studyName: "s",
        trialId: 2,
        params: { optimizer: "rmsprop" },
        results: { loss: 0.4 },
        complete: true,
      },
    ];

    render(
      <TrialTable
        trials={catTrials}
        objectives={objectives}
        selectedIds={new Set()}
        onSelect={() => {}}
      />,
    );

    const optHeader = screen
      .getAllByText("optimizer")
      .find((el) => el.tagName === "TH")!;

    fireEvent.click(optHeader);
    expect(dataRows()[0]?.textContent).toContain("adam");
    expect(dataRows()[1]?.textContent).toContain("rmsprop");
    expect(dataRows()[2]?.textContent).toContain("sgd");

    fireEvent.click(
      screen
        .getAllByText((t) => t.includes("optimizer"))
        .find((el) => el.tagName === "TH")!,
    );
    expect(dataRows()[0]?.textContent).toContain("sgd");
    expect(dataRows()[2]?.textContent).toContain("adam");
  });
});
