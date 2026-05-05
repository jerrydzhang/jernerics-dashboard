import type { ObjectiveEntry } from "../hooks/useObjective";
import { parseStudyName } from "../queries/studyName";
import type { Trial } from "../transforms/groupTrials";
import { computeObjectiveStats } from "../transforms/objectiveStats";

interface ObjectiveSummaryStripProps {
  trials: Trial[];
  objectives: ObjectiveEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
}

function formatValue(v: number): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  if (Number.isInteger(v)) return v.toString();
  if (Math.abs(v) >= 100) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toPrecision(3);
}

function Sparkline({
  bins,
  binTrialKeys,
  selectedIds,
  onBinClick,
}: {
  bins: number[];
  binTrialKeys: string[][];
  selectedIds: Set<string>;
  onBinClick: (trialKeys: string[]) => void;
}) {
  if (bins.length === 0) return null;
  const max = Math.max(...bins, 1);
  const barWidth = 100 / bins.length;

  const selectedPerBin = binTrialKeys.map((keys) =>
    keys.filter((k) => selectedIds.has(k)).length,
  );
  const hasSelection = selectedIds.size > 0;

  return (
    <svg
      viewBox="0 0 100 20"
      className="mt-1.5 w-full"
      preserveAspectRatio="none"
    >
      {bins.map((count, i) => {
        const h = (count / max) * 18;
        const selCount = selectedPerBin[i] ?? 0;
        const selH = (selCount / max) * 18;
        const unselectedH = h - selH;

        return (
          <g
            key={i}
            onClick={() => onBinClick(binTrialKeys[i] ?? [])}
            style={{ cursor: "pointer" }}
          >
            {/* full bar (unselected or no-selection background) */}
            <rect
              x={i * barWidth}
              y={20 - h}
              width={barWidth - 1}
              height={h}
              fill={hasSelection ? "var(--base02)" : "var(--base02)"}
              opacity={hasSelection && selCount === 0 ? 0.3 : 1}
            />
            {/* selected portion stacked on top */}
            {selCount > 0 && (
              <rect
                x={i * barWidth}
                y={20 - selH}
                width={barWidth - 1}
                height={selH}
                fill="var(--base0B)"
              />
            )}
            {/* invisible wider click target */}
            <rect
              x={i * barWidth}
              y={0}
              width={barWidth}
              height={20}
              fill="transparent"
            />
          </g>
        );
      })}
    </svg>
  );
}

function ObjectiveCard({
  label,
  stats,
  direction,
  selectedIds,
  onSelect,
  multiSweep,
}: {
  label: string;
  stats: ReturnType<typeof computeObjectiveStats>;
  direction: "minimize" | "maximize";
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
  multiSweep: boolean;
}) {
  const arrow = direction === "maximize" ? "↑" : "↓";

  return (
    <div className="min-w-[160px] flex-1 bg-surface px-4 py-3">
      <div className="text-sm text-muted">
        {label} {arrow}
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-bright">
          {formatValue(stats.best)}
        </span>
        <span className="text-xs text-muted">
          {multiSweep
            ? `${parseStudyName(stats.bestTrialKey.split("\0")[0]!)?.configStem ?? stats.bestTrialKey.split("\0")[0]} #${stats.bestTrialKey.split("\0")[1]}`
            : `trial ${stats.bestTrialKey.split("\0")[1]}`}
        </span>
      </div>
      <div className="mt-0.5 flex gap-3 text-xs text-muted">
        <span>
          med {formatValue(stats.median)}
        </span>
        <span>
          wrst {formatValue(stats.worst)}
        </span>
      </div>
      <div className="mt-0.5 text-xs text-muted">
        {stats.count} trials
        {stats.incompleteCount > 0 && (
          <span> ({stats.incompleteCount} incomplete)</span>
        )}
      </div>
      <Sparkline
        bins={stats.histogram}
        binTrialKeys={stats.binTrialKeys}
        selectedIds={selectedIds}
        onBinClick={(keys) => {
          const allSelected = keys.every((k) => selectedIds.has(k));
          if (allSelected) {
            const next = new Set(selectedIds);
            for (const k of keys) next.delete(k);
            onSelect(next);
          } else {
            onSelect(new Set(keys));
          }
        }}
      />
    </div>
  );
}

export function ObjectiveSummaryStrip({
  trials,
  objectives,
  selectedIds,
  onSelect,
}: ObjectiveSummaryStripProps) {
  const cards = objectives
    .map((obj) => {
      const stats = computeObjectiveStats(trials, obj.key, obj.direction);
      if (stats.count === 0) return null;
      return (
        <ObjectiveCard
          key={obj.key}
          label={obj.key}
          stats={stats}
          direction={obj.direction}
          selectedIds={selectedIds}
          onSelect={onSelect}
          multiSweep={new Set(trials.map((t) => t.studyName)).size > 1}
        />
      );
    })
    .filter(Boolean);

  if (cards.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {cards}
    </div>
  );
}
