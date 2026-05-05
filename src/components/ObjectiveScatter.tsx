import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

import type { ObjectiveEntry } from "../hooks/useObjective";
import { categorical } from "../theme/register";
import type { Trial } from "../transforms/groupTrials";
import { computeParetoSteps } from "../transforms/paretoSteps";

interface ObjectiveScatterProps {
  trials: Trial[];
  objectives: ObjectiveEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
}

export function ObjectiveScatter({
  trials,
  objectives,
  selectedIds,
  onSelect,
}: ObjectiveScatterProps) {
  const objCount = objectives.length;

  // For 3+ objectives, axis selectors default to first two
  const [xIdx, setXIdx] = useState(0);
  const [yIdx, setYIdx] = useState(objCount >= 2 ? 1 : 0);

  // Axis objectives
  const xAxisObj = objectives[xIdx] ?? null;
  const yAxisObj = objCount >= 2 ? (objectives[yIdx] ?? null) : null;

  const hasSelection = selectedIds.size > 0;

  // Sweep colors
  const sweepColor = useMemo(() => {
    const names = [...new Set(trials.map((t) => t.studyName))];
    const map = new Map<string, string>();
    for (const [i, name] of names.entries()) {
      const color = categorical[i % categorical.length];
      if (color) map.set(name, color);
    }
    return map;
  }, [trials]);

  // Pareto front steps (only when 2 objectives plotted)
  const paretoSteps = useMemo(() => {
    if (!xAxisObj || !yAxisObj || objCount < 2) return [];
    return computeParetoSteps(trials, [xAxisObj, yAxisObj]);
  }, [trials, xAxisObj, yAxisObj, objCount]);

  interface ScatterItem {
    value: [number, number];
    key: string;
    studyName: string;
    trialId: number;
    complete: boolean;
  }

  // Scatter data
  const scatterData: ScatterItem[] = useMemo(() => {
    if (!xAxisObj) return [];

    if (objCount === 1) {
      // 1 objective: trial index vs value
      return trials
        .map((t, i): ScatterItem | null => {
          const val = t.results[xAxisObj.key];
          if (val === undefined) return null;
          return {
            value: [i, val],
            key: `${t.studyName}\0${t.trialId}`,
            studyName: t.studyName,
            trialId: t.trialId,
            complete: t.complete,
          };
        })
        .filter((x): x is ScatterItem => x !== null);
    }

    // 2+ objectives: obj X vs obj Y
    if (!yAxisObj) return [];
    return trials
      .map((t): ScatterItem | null => {
        const xv = t.results[xAxisObj.key];
        const yv = t.results[yAxisObj.key];
        if (xv === undefined || yv === undefined) return null;
        return {
          value: [xv, yv],
          key: `${t.studyName}\0${t.trialId}`,
          studyName: t.studyName,
          trialId: t.trialId,
          complete: t.complete,
        };
      })
      .filter((x): x is ScatterItem => x !== null);
  }, [trials, xAxisObj, yAxisObj, objCount]);

  const option = useMemo(() => {
    if (scatterData.length === 0) {
      return {
        title: {
          text: xAxisObj
            ? "No data for selected objectives"
            : "Configure objectives to see scatter",
          left: "center",
          top: "center",
          textStyle: { color: "#6d6562", fontWeight: "normal", fontSize: 13 },
        },
      };
    }

    const dimOpacity = Math.max(0.05, 0.5 / Math.sqrt(scatterData.length));

    // Separate nondominated keys for larger markers
    const paretoKeys = new Set(paretoSteps.map((p) => p.key));

    const series: unknown[] = [];

    // Pareto stepped line (2+ objectives)
    if (paretoSteps.length >= 2 && yAxisObj) {
      // Build staircase: for each consecutive pair, insert an intermediate point
      const stairData: [number, number][] = [];
      for (const step of paretoSteps) {
        if (stairData.length > 0) {
          const prev = stairData[stairData.length - 1];
          if (prev) stairData.push([step.x, prev[1]]);
        }
        stairData.push([step.x, step.y]);
      }

      series.push({
        type: "line",
        name: "Pareto front",
        data: stairData,
        lineStyle: { color: "#c4a6a8", width: 1.5, type: "dashed" },
        symbol: "none",
        z: 0,
        silent: true,
      });
    }

    // Scatter series
    series.push({
      type: "scatter",
      name: "Trials",
      data: scatterData.map((item: ScatterItem) => ({
        value: item.value,
        key: item.key,
        sweepName: item.studyName,
        sweepColor: sweepColor.get(item.studyName) ?? "#c4a6a8",
        symbol: item.complete ? "circle" : "diamond",
        itemStyle: {
          color: sweepColor.get(item.studyName),
          opacity: hasSelection
            ? selectedIds.has(item.key)
              ? 1
              : dimOpacity
            : 1,
        },
        symbolSize: paretoKeys.has(item.key) ? 12 : 7,
      })),
      z: 5,
    });

    const xName = xAxisObj?.key ?? "";
    const yName =
      objCount === 1 ? (xAxisObj?.key ?? "") : (yAxisObj?.key ?? "");

    return {
      animation: false,
      title: { show: false },
      grid: { left: 40, right: 40, top: 30, bottom: 40 },
      tooltip: {
        show: true,
        trigger: "item",
        confine: true,
        formatter: (params: Record<string, unknown>) => {
          const data = params.data as Record<string, unknown> | undefined;
          if (!data) return "no data";
          const key = data.key as string | undefined;
          const value = data.value as number[] | undefined;
          const trialId = key?.split("\0")[1] ?? "?";
          const sweep = (data.sweepName as string) ?? "";
          const color = (data.sweepColor as string) ?? "#c4a6a8";
          const xv = value?.[0];
          const yv = value?.[1];
          const xLabel = xName || "index";
          const yLabel = yName || xName;
          const sweepShort = shortSweep(sweep);
          return `<div style="font-size:11px">
            <div style="color:${color}">${sweepShort ? `${sweepShort} ` : ""}Trial ${trialId}</div>
            ${xv != null ? `<div>${xLabel}: ${fmtNum(xv)}</div>` : ""}
            ${objCount >= 2 && yv != null ? `<div>${yLabel}: ${fmtNum(yv)}</div>` : ""}
          </div>`;
        },
      },
      xAxis: {
        type: "value",
        name: objCount === 1 ? "Trial" : xName,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { color: "#6d6562", fontSize: 11 },
        axisLabel: {
          color: "#6d6562",
          fontSize: 11,
        },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: yName,
        nameTextStyle: { color: "#6d6562", fontSize: 11 },
        axisLabel: { color: "#6d6562", fontSize: 11 },
        axisLine: { lineStyle: { color: "#292624" } },
        splitLine: { lineStyle: { color: "#292624", type: "dashed" } },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
        },
        {
          type: "inside",
          yAxisIndex: 0,
          filterMode: "none",
        },
      ],
      series,
    };
  }, [
    scatterData,
    paretoSteps,
    sweepColor,
    hasSelection,
    selectedIds,
    xAxisObj,
    yAxisObj,
    objCount,
  ]);

  function handleClick(params: {
    componentType?: string;
    data?: { key?: string };
  }) {
    if (!params?.data?.key) return;
    const next = new Set(selectedIds);
    next.has(params.data.key)
      ? next.delete(params.data.key)
      : next.add(params.data.key);
    onSelect(next);
  }

  return (
    <div className="bg-surface p-4">
      {objCount >= 3 && (
        <div className="mb-3 flex items-center gap-3">
          <label className="text-sm text-muted">
            X:{" "}
            <select
              value={xIdx}
              onChange={(e) => setXIdx(Number(e.target.value))}
              className="bg-raised px-2 py-1 text-sm text-primary"
            >
              {objectives.map((o, i) => (
                <option key={o.key} value={i}>
                  {o.key}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            Y:{" "}
            <select
              value={yIdx}
              onChange={(e) => setYIdx(Number(e.target.value))}
              className="bg-raised px-2 py-1 text-sm text-primary"
            >
              {objectives.map((o, i) => (
                <option key={o.key} value={i}>
                  {o.key}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <ReactECharts
        option={option}
        theme="mountain"
        style={{ height: 320 }}
        onEvents={{ click: handleClick }}
      />
    </div>
  );
}

function fmtNum(v: unknown): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n) >= 100) return n.toFixed(1);
  if (Math.abs(n) >= 1) return n.toFixed(3);
  return n.toPrecision(3);
}

function shortSweep(name: string): string {
  const idx = name.lastIndexOf("_");
  if (idx < 0) return name;
  return name.slice(0, idx);
}
