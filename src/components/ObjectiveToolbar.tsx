import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";

import type { ObjectiveEntry } from "../hooks/useObjective";
import { useResultKeys } from "../hooks/useResultKeys";

interface ObjectiveToolbarProps {
  project: string;
  sweepNames: string[];
  objectives: ObjectiveEntry[] | null;
  onSetObjectives: (entries: ObjectiveEntry[]) => void;
}

export function ObjectiveToolbar({
  project,
  sweepNames,
  objectives,
  onSetObjectives,
}: ObjectiveToolbarProps) {
  const resultKeys = useResultKeys(project, sweepNames);
  const entries = objectives ?? [];
  const hasObjectives = entries.length > 0;

  return (
    <div className="flex items-center gap-2">
      {hasObjectives ? (
        entries.map((obj) => (
          <span
            key={obj.key}
            className="inline-flex items-center gap-1 bg-raised px-2 py-0.5 text-sm font-mono text-primary"
          >
            {obj.key}
            <span className="text-muted">
              {obj.direction === "minimize" ? "↓" : "↑"}
            </span>
          </span>
        ))
      ) : (
        <span className="text-sm text-muted">No objectives configured</span>
      )}

      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="px-2 py-0.5 text-sm text-primary hover:bg-raised cursor-pointer"
          >
            {hasObjectives ? "Edit" : "Configure"}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="z-50 bg-surface p-4 min-w-[280px]"
            align="start"
            sideOffset={4}
          >
            <ObjectiveEditor
              availableKeys={resultKeys.data ?? []}
              entries={entries}
              onSetObjectives={onSetObjectives}
            />
            <Popover.Arrow className="fill-surface" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function ObjectiveEditor({
  availableKeys,
  entries,
  onSetObjectives,
}: {
  availableKeys: string[];
  entries: ObjectiveEntry[];
  onSetObjectives: (entries: ObjectiveEntry[]) => void;
}) {
  const [draft, setDraft] = useState<ObjectiveEntry[]>(entries);

  const toggleKey = (key: string) => {
    const existing = draft.find((e) => e.key === key);
    if (existing) {
      setDraft(draft.filter((e) => e.key !== key));
    } else {
      setDraft([...draft, { key, direction: "minimize" }]);
    }
  };

  const toggleDirection = (key: string) => {
    setDraft(
      draft.map((e) =>
        e.key === key
          ? {
              ...e,
              direction: e.direction === "minimize" ? "maximize" : "minimize",
            }
          : e,
      ),
    );
  };

  const selectedKeys = new Set(draft.map((e) => e.key));

  if (availableKeys.length === 0) {
    return <p className="text-sm text-muted">No result keys found</p>;
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        Objectives
      </h3>
      <ul className="space-y-1">
        {availableKeys.map((key) => {
          const isSelected = selectedKeys.has(key);
          const entry = draft.find((e) => e.key === key);
          return (
            <li key={key} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleKey(key)}
                className={`flex-1 text-left text-sm cursor-pointer px-1 py-0.5 ${
                  isSelected ? "text-primary" : "text-muted"
                }`}
              >
                {key}
              </button>
              {isSelected && (
                <button
                  type="button"
                  onClick={() => toggleDirection(key)}
                  className="text-sm text-muted hover:text-primary cursor-pointer px-1"
                  title={
                    entry?.direction === "minimize" ? "Minimize" : "Maximize"
                  }
                >
                  {entry?.direction === "minimize" ? "↓" : "↑"}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onSetObjectives(draft)}
        className="mt-3 w-full bg-raised px-3 py-1.5 text-sm text-primary hover:text-bright cursor-pointer"
      >
        Apply
      </button>
    </div>
  );
}
