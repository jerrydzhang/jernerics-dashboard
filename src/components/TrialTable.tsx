import { useState } from "react";

import type { ObjectiveEntry } from "../hooks/useObjective";
import { computeParetoFront } from "../transforms/pareto";
import { makeTrialKey, type Trial } from "../trial";

interface TrialTableProps {
  trials: Trial[];
  objectives: ObjectiveEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
}

type SortDir = "asc" | "desc" | null;

export function TrialTable({
  trials,
  objectives,
  selectedIds,
  onSelect,
}: TrialTableProps) {
  const [sortKey, setSortKey] = useState<string | null>("trialId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterText, setFilterText] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "done" | "incomplete"
  >("all");
  const [paretoOnly, setParetoOnly] = useState(false);
  const [anchorIdx, setAnchorIdx] = useState<number | null>(null);
  const [anchorMode, setAnchorMode] = useState<"select" | "deselect">("select");
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());

  // Derive param columns from all trials
  const paramKeys = Array.from(
    new Set(trials.flatMap((t) => Object.keys(t.params))),
  ).sort();

  const allColumns = [
    { key: "trialId", label: "Trial" },
    ...objectives.map((o) => ({ key: `obj:${o.key}`, label: o.key })),
    ...paramKeys.map((k) => ({ key: `param:${k}`, label: k })),
  ];

  const columns = allColumns.filter((c) => !hiddenCols.has(c.key));

  function cellValue(trial: Trial, col: (typeof columns)[number]): string {
    if (col.key === "trialId") return String(trial.trialId);
    if (col.key.startsWith("obj:")) {
      const resultKey = col.key.slice(4);
      const val = trial.finalMetrics[resultKey];
      return val !== undefined ? String(val) : "—";
    }
    const paramKey = col.key.slice(6);
    return trial.params[paramKey] ?? "—";
  }

  function numericCellValue(trial: Trial, colKey: string): number | null {
    if (colKey === "trialId") return trial.trialId;
    if (colKey.startsWith("obj:")) {
      const val = trial.finalMetrics[colKey.slice(4)];
      return val !== undefined ? val : null;
    }
    if (colKey.startsWith("param:")) {
      const n = Number(trial.params[colKey.slice(6)]);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  }

  function handleSort(colKey: string) {
    if (sortKey === colKey) {
      // Cycle: asc → desc → clear
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir(null);
      }
    } else {
      setSortKey(colKey);
      setSortDir("asc");
    }
  }

  // Filter by status
  let filtered = trials;
  if (statusFilter === "done") {
    filtered = trials.filter((t) => t.complete);
  } else if (statusFilter === "incomplete") {
    filtered = trials.filter((t) => !t.complete);
  }

  // Filter by text
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = filtered.filter((t) =>
      columns.some((col) => cellValue(t, col).toLowerCase().includes(lower)),
    );
  }

  // Filter by Pareto
  if (paretoOnly && objectives.length > 0) {
    const paretoKeys = computeParetoFront(filtered, objectives);
    filtered = filtered.filter((t) =>
      paretoKeys.has(makeTrialKey(t.studyName, t.trialId)),
    );
  }

  // Sort trials
  let sorted = filtered;
  if (sortKey && sortDir) {
    sorted = [...filtered].sort((a, b) => {
      const va = numericCellValue(a, sortKey);
      const vb = numericCellValue(b, sortKey);
      // Both numeric
      if (va !== null && vb !== null) {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      // Both non-numeric: string compare on cell values
      const sa = cellValue(a, columns.find((c) => c.key === sortKey)!);
      const sb = cellValue(b, columns.find((c) => c.key === sortKey)!);
      if (va === null && vb === null) {
        return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
      }
      // One numeric, one not: numeric first
      return va !== null ? -1 : 1;
    });
  }

  const allSelected =
    sorted.length > 0 &&
    sorted.every((t) => selectedIds.has(makeTrialKey(t.studyName, t.trialId)));

  return (
    <div>
      <input
        type="text"
        placeholder="Filter trials..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        className="mb-2 w-full bg-raised px-3 py-1.5 text-sm text-primary"
      />
      <div className="mb-2 flex gap-1 text-sm">
        {["all", "done", "incomplete"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s as typeof statusFilter)}
            className={`px-2 py-0.5 cursor-pointer ${
              statusFilter === s ? "bg-raised text-bright" : "text-muted"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setParetoOnly(!paretoOnly)}
          className={`px-2 py-0.5 cursor-pointer ${
            paretoOnly ? "bg-raised text-bright" : "text-muted"
          } ${objectives.length === 0 ? "opacity-40" : ""}`}
          disabled={objectives.length === 0}
        >
          Pareto
        </button>
        <button
          type="button"
          onClick={() => {
            if (allSelected) {
              onSelect(new Set());
            } else {
              onSelect(
                new Set(
                  sorted.map((t) => makeTrialKey(t.studyName, t.trialId)),
                ),
              );
            }
          }}
          className="px-2 py-0.5 cursor-pointer text-muted"
        >
          {allSelected ? "Select none" : "Select all"}
        </button>
        <button
          type="button"
          onClick={() => {
            const header = columns.map((c) => c.label).join("\t");
            const rows = sorted.map((t) =>
              columns.map((c) => cellValue(t, c)).join("\t"),
            );
            navigator.clipboard.writeText([header, ...rows].join("\n"));
          }}
          className="px-2 py-0.5 cursor-pointer text-muted"
        >
          Copy
        </button>
        <ColumnVisibility
          columns={allColumns}
          hiddenCols={hiddenCols}
          onToggle={(key) => {
            setHiddenCols((prev) => {
              const next = new Set(prev);
              next.has(key) ? next.delete(key) : next.add(key);
              return next;
            });
          }}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full select-none text-sm">
          <thead>
            <tr className="text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className="cursor-pointer whitespace-nowrap px-3 py-2 text-left font-normal"
                >
                  {col.label}
                  {sortKey === col.key && sortDir === "asc" && " ↑"}
                  {sortKey === col.key && sortDir === "desc" && " ↓"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="rhythm-table text-primary">
            {sorted.map((trial, idx) => {
              const trialKey = makeTrialKey(trial.studyName, trial.trialId);
              const isSelected = selectedIds.has(trialKey);
              return (
                <tr
                  key={trialKey}
                  onClick={(e) => {
                    let next: Set<string>;
                    if (e.shiftKey && anchorIdx !== null) {
                      const from = Math.min(anchorIdx, idx);
                      const to = Math.max(anchorIdx, idx);
                      next = new Set(selectedIds);
                      for (let i = from; i <= to; i++) {
                        const t = sorted[i];
                        if (t) {
                          const key = makeTrialKey(t.studyName, t.trialId);
                          anchorMode === "select"
                            ? next.add(key)
                            : next.delete(key);
                        }
                      }
                    } else {
                      next = new Set(selectedIds);
                      const wasSelected = next.has(trialKey);
                      next.has(trialKey)
                        ? next.delete(trialKey)
                        : next.add(trialKey);
                      setAnchorMode(wasSelected ? "deselect" : "select");
                    }
                    setAnchorIdx(idx);
                    onSelect(next);
                  }}
                  className={`cursor-pointer ${
                    isSelected ? "bg-raised text-bright" : "hover:bg-raised"
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2 font-mono">
                      {cellValue(trial, col)}
                    </td>
                  ))}
                  {!trial.complete && (
                    <td className="px-2 py-2">
                      <span className="text-xs text-muted">incomplete</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ColumnVisibility({
  columns,
  hiddenCols,
  onToggle,
}: {
  columns: { key: string; label: string }[];
  hiddenCols: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <details className="relative inline-block">
      <summary className="cursor-pointer px-2 py-0.5 text-sm text-muted">
        Columns
      </summary>
      <div className="absolute left-0 top-full z-50 mt-1 bg-surface p-3 min-w-[160px]">
        <ul className="space-y-1">
          {columns.map((col) => (
            <li key={col.key}>
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center gap-2 text-sm text-left ${
                  hiddenCols.has(col.key) ? "text-muted" : "text-bright"
                }`}
                onClick={() => onToggle(col.key)}
              >
                {col.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
