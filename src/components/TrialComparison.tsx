import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import { artifactUrl } from "../api/client";
import { shortSweep } from "../chartUtils";
import type { ObjectiveEntry } from "../hooks/useObjective";
import {
  useArtifactMeta,
  useMetricData,
  useMetricKeys,
} from "../hooks/useTrialData";
import { colors, withAlpha } from "../theme/register";
import { computeDiff } from "../transforms/trialDiff";
import { makeTrialKey, type Trial } from "../trial";

type Tab = "params" | "metrics" | "artifacts";

interface TrialComparisonProps {
  trials: Trial[];
  objectives: ObjectiveEntry[];
  project: string;
  sweepNames: string[];
  onClose: () => void;
}

export function TrialComparison({
  trials,
  objectives,
  project,
  sweepNames,
  onClose,
}: TrialComparisonProps) {
  const [tab, setTab] = useState<Tab>("params");

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-dismiss
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: withAlpha(colors.base01, 0.6) }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Trial comparison"
        className="bg-surface max-h-[90vh] w-[90vw] max-w-[1200px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-base font-medium text-bright">
            Comparing {trials.length} trials
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer px-2 py-1 text-sm text-muted hover:text-primary"
          >
            Close
          </button>
        </div>

        <div className="flex gap-1 border-b border-deep px-6">
          {(["params", "metrics", "artifacts"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`cursor-pointer px-3 py-2 text-sm capitalize ${
                tab === t
                  ? "bg-raised text-bright"
                  : "text-muted hover:text-primary"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div
          className="overflow-y-auto p-6"
          style={{ maxHeight: "calc(90vh - 100px)" }}
        >
          {tab === "params" && (
            <ParamsDiff trials={trials} objectives={objectives} />
          )}
          {tab === "metrics" && (
            <MetricOverlay
              trials={trials}
              project={project}
              sweepNames={sweepNames}
            />
          )}
          {tab === "artifacts" && (
            <ArtifactComparison
              trials={trials}
              project={project}
              sweepNames={sweepNames}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Params diff tab
// ---------------------------------------------------------------------------

function ParamsDiff({
  trials,
  objectives,
}: {
  trials: Trial[];
  objectives: ObjectiveEntry[];
}) {
  const diff = useMemo(() => computeDiff(trials), [trials]);

  // Combine params + results into one table, params first
  const rows = [
    ...diff.params.map((r) => ({ ...r, type: "param" as const })),
    ...diff.finalMetrics.map((r) => ({ ...r, type: "metric" as const })),
  ];

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-muted">
          <th className="px-3 py-2 text-left font-normal">Key</th>
          {trials.map((t) => (
            <th
              key={makeTrialKey(t.studyName, t.trialId)}
              className="px-3 py-2 text-left font-normal"
            >
              <span className="font-mono">T{t.trialId}</span>
              <span className="ml-2 text-xs text-muted">
                {shortSweep(t.studyName)}
              </span>
            </th>
          ))}
          <th className="px-3 py-2 text-left font-normal" />
        </tr>
      </thead>
      <tbody className="text-primary">
        {rows.map((row) => (
          <tr key={`${row.type}:${row.key}`}>
            <td className="px-3 py-1.5 font-mono text-muted">
              {row.key}
              {row.type === "metric" &&
                objectives.some((o) => o.key === row.key) && (
                  <span className="ml-1 text-xs">★</span>
                )}
            </td>
            {row.values.map((v, i) => (
              <td
                key={`v-${i}`}
                className={`px-3 py-1.5 font-mono ${
                  row.isSame ? "text-muted" : "text-primary"
                }`}
              >
                {v !== null ? String(v) : "—"}
              </td>
            ))}
            <td className="px-3 py-1.5 text-xs text-muted">
              {row.isSame ? "" : "≠"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------------------
// Metric overlay tab
// ---------------------------------------------------------------------------

function MetricOverlay({
  trials,
  project,
  sweepNames,
}: {
  trials: Trial[];
  project: string;
  sweepNames: string[];
}) {
  const metricKeys = useMetricKeys(project, sweepNames);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Auto-select first key
  if (!selectedKey && metricKeys.data && metricKeys.data.length > 0) {
    setSelectedKey(metricKeys.data[0] ?? "");
  }

  const metricData = useMetricData(project, sweepNames, selectedKey);

  // Filter to only selected trials
  const trialIds = useMemo(
    () => new Set(trials.map((t) => makeTrialKey(t.studyName, t.trialId))),
    [trials],
  );
  const filteredSeries = useMemo(
    () =>
      (metricData.data ?? []).filter((s) =>
        trialIds.has(makeTrialKey(s.studyName, s.trialId)),
      ),
    [metricData.data, trialIds],
  );

  const option = useMemo(() => {
    if (filteredSeries.length === 0) {
      return {
        title: {
          text: selectedKey ? "No data for this metric" : "Select a metric",
          left: "center",
          top: "center",
          textStyle: {
            color: colors.base03,
            fontWeight: "normal",
            fontSize: 13,
          },
        },
      };
    }

    return {
      animation: false,
      title: { show: false },
      grid: { left: 50, right: 30, top: 20, bottom: 40 },
      tooltip: {
        trigger: "axis" as const,
        confine: true,
      },
      xAxis: {
        type: "value" as const,
        name: "step",
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: { color: colors.base03, fontSize: 11 },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value" as const,
        name: selectedKey ?? "",
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: { color: colors.base03, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.base02 } },
        splitLine: { lineStyle: { color: colors.base02, type: "dashed" } },
      },
      series: filteredSeries.map((s) => ({
        type: "line" as const,
        name: `T${s.trialId}`,
        data: s.steps.map((pt) => [pt.step, pt.value]),
        lineStyle: { width: 2 },
        symbol: "none" as const,
      })),
    };
  }, [filteredSeries, selectedKey]);

  return (
    <div>
      <div className="mb-3">
        <select
          value={selectedKey ?? ""}
          onChange={(e) => setSelectedKey(e.target.value)}
          className="bg-raised px-2 py-1 text-sm text-primary"
        >
          <option value="" disabled>
            Select metric
          </option>
          {metricKeys.data?.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <ReactECharts option={option} theme="mountain" style={{ height: 300 }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Artifacts tab
// ---------------------------------------------------------------------------

function ArtifactComparison({
  trials,
  project,
  sweepNames,
}: {
  trials: Trial[];
  project: string;
  sweepNames: string[];
}) {
  const artifactMeta = useArtifactMeta(project, sweepNames, trials);

  // Group artifacts by key across trials
  const grouped = useMemo(() => {
    const trialIds = new Set(
      trials.map((t) => makeTrialKey(t.studyName, t.trialId)),
    );
    const filtered = (artifactMeta.data ?? []).filter((ta) =>
      trialIds.has(makeTrialKey(ta.studyName, ta.trialId)),
    );

    const keys = Array.from(
      new Set(filtered.flatMap((ta) => ta.artifacts.map((a) => a.key))),
    ).sort();

    return keys.map((key) => ({
      key,
      byTrial: trials.map((t) => {
        const ta = filtered.find(
          (f) => f.studyName === t.studyName && f.trialId === t.trialId,
        );
        return ta?.artifacts.find((a) => a.key === key) ?? null;
      }),
    }));
  }, [artifactMeta.data, trials]);

  if (!artifactMeta.data) {
    return <div className="text-sm text-muted">Loading artifacts...</div>;
  }

  if (grouped.length === 0) {
    return <div className="text-sm text-muted">No artifacts found.</div>;
  }

  return (
    <div className="space-y-6">
      {grouped.map((group) => (
        <div key={group.key}>
          <h3 className="mb-2 text-sm font-medium text-muted">{group.key}</h3>
          <div className="flex gap-4">
            {group.byTrial.map((artifact, i) => {
              const trial = trials[i];
              const trialKey = trial
                ? makeTrialKey(trial.studyName, trial.trialId)
                : `empty-${i}`;
              return (
                <div key={trialKey} className="flex-1">
                  <div className="mb-1 text-xs text-muted">
                    T{trial?.trialId}
                  </div>
                  {artifact && trial ? (
                    <ArtifactPreview
                      project={project}
                      studyName={trial.studyName}
                      trialId={trial.trialId}
                      artifact={artifact}
                    />
                  ) : (
                    <div className="text-xs text-muted">—</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ArtifactPreview({
  project,
  studyName,
  trialId,
  artifact,
}: {
  project: string;
  studyName: string;
  trialId: number;
  artifact: { key: string; filename: string };
}) {
  const url = artifactUrl(project, studyName, trialId, artifact.key);
  const ext = artifact.filename.split(".").pop()?.toLowerCase() ?? "";
  const isImage = ["png", "jpg", "jpeg", "svg", "webp", "gif"].includes(ext);

  if (isImage) {
    return (
      <img
        src={url}
        alt={artifact.filename}
        className="max-w-full"
        style={{ maxHeight: 200 }}
      />
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-steel hover:text-bright"
    >
      {artifact.filename}
    </a>
  );
}

// ---------------------------------------------------------------------------
