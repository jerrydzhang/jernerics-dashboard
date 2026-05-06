import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";
import { buildSweepColorMap, formatNumber, shortSweep } from "../chartUtils";
import type { ObjectiveEntry } from "../hooks/useObjective";
import { colors } from "../theme/register";
import {
  type AxisScale,
  applyAxisScale,
  inverseAxisScale,
  scaleLabel,
} from "../transforms/axisScale";
import { computeParetoSteps } from "../transforms/paretoSteps";
import { makeTrialKey, parseTrialKey, type Trial } from "../trial";

const ALL_SCALES: AxisScale[] = [
  "linear",
  "log",
  "log1p",
  "symlog",
  "negLogOneMinusX",
];

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
  const [xScale, setXScale] = useState<AxisScale>("linear");
  const [yScale, setYScale] = useState<AxisScale>("linear");

  // Axis objectives
  const xAxisObj = objectives[xIdx] ?? null;
  const yAxisObj = objCount >= 2 ? (objectives[yIdx] ?? null) : null;

  const hasSelection = selectedIds.size > 0;

  const sweepNames = useMemo(
    () => [...new Set(trials.map((t) => t.studyName))],
    [trials],
  );
  const sweepColor = useMemo(
    () => buildSweepColorMap(sweepNames),
    [sweepNames],
  );

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
          const val = t.finalMetrics[xAxisObj.key];
          if (val === undefined) return null;
          return {
            value: [i, val],
            key: makeTrialKey(t.studyName, t.trialId),
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
        const xv = t.finalMetrics[xAxisObj.key];
        const yv = t.finalMetrics[yAxisObj.key];
        if (xv === undefined || yv === undefined) return null;
        return {
          value: [xv, yv],
          key: makeTrialKey(t.studyName, t.trialId),
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
          textStyle: {
            color: colors.base03,
            fontWeight: "normal",
            fontSize: 13,
          },
        },
      };
    }

    const dimOpacity = Math.max(0.05, 0.5 / Math.sqrt(scatterData.length));

    // Separate nondominated keys for larger markers
    const paretoKeys = new Set(paretoSteps.map((p) => p.key));

    // Helper: transform a value, returning NaN for out-of-domain
    const tx = (v: number) => {
      const r = applyAxisScale(v, xScale);
      return r !== null ? r : NaN;
    };
    const ty = (v: number) => {
      const r = applyAxisScale(v, yScale);
      return r !== null ? r : NaN;
    };

    const series: unknown[] = [];

    // Pareto stepped line (2+ objectives)
    if (paretoSteps.length >= 2 && yAxisObj) {
      const stairData: [number, number][] = [];
      for (const step of paretoSteps) {
        const sx = tx(step.x);
        const sy = ty(step.y);
        if (Number.isNaN(sx) || Number.isNaN(sy)) continue;
        if (stairData.length > 0) {
          const prev = stairData[stairData.length - 1];
          if (prev) stairData.push([sx, prev[1]]);
        }
        stairData.push([sx, sy]);
      }

      series.push({
        type: "line",
        name: "Pareto front",
        data: stairData,
        lineStyle: { color: colors.base04, width: 1.5, type: "dashed" },
        symbol: "none",
        z: 0,
        silent: true,
      });
    }

    // Scatter series (transform values for display)
    series.push({
      type: "scatter",
      name: "Trials",
      data: scatterData.map((item: ScatterItem) => {
        const rawX = item.value[0];
        const rawY = item.value[1];
        const chartX = objCount === 1 ? rawX : tx(rawX);
        const chartY = ty(rawY);
        return {
          value: [chartX, chartY] as [number, number],
          rawX,
          rawY,
          key: item.key,
          sweepName: item.studyName,
          sweepColor: sweepColor.get(item.studyName) ?? colors.base04,
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
        };
      }),
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
          const trialId = key ? parseTrialKey(key).trialId : "?";
          const sweep = (data.sweepName as string) ?? "";
          const color = (data.sweepColor as string) ?? colors.base04;
          const rawX = data.rawX as number | undefined;
          const rawY = data.rawY as number | undefined;
          const xLabel = xName || "index";
          const yLabel = yName || xName;
          const sweepShort = shortSweep(sweep);
          return `<div style="font-size:11px">
            <div style="color:${color}">${sweepShort ? `${sweepShort} ` : ""}Trial ${trialId}</div>
            ${rawX != null ? `<div>${xLabel}: ${formatNumber(rawX)}</div>` : ""}
            ${objCount >= 2 && rawY != null ? `<div>${yLabel}: ${formatNumber(rawY)}</div>` : ""}
          </div>`;
        },
      },
      xAxis: {
        type: "value",
        name: objCount === 1 ? "Trial" : xName,
        nameLocation: "middle",
        nameGap: 30,
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: {
          color: colors.base03,
          fontSize: 11,
          formatter:
            xScale !== "linear" && objCount >= 2
              ? (v: number) => formatNumber(inverseAxisScale(v, xScale))
              : undefined,
        },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: yName,
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: {
          color: colors.base03,
          fontSize: 11,
          formatter:
            yScale !== "linear"
              ? (v: number) => formatNumber(inverseAxisScale(v, yScale))
              : undefined,
        },
        axisLine: { lineStyle: { color: colors.base02 } },
        splitLine: { lineStyle: { color: colors.base02, type: "dashed" } },
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
    xScale,
    yScale,
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

  const showXScale = objCount >= 2;
  const showYScale = true;

  return (
    <div className="bg-surface p-4">
      <div className="mb-3 flex items-center gap-3 flex-wrap">
        {objCount >= 3 && (
          <>
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
          </>
        )}
        {showXScale && (
          <label className="text-sm text-muted">
            X scale{" "}
            <select
              value={xScale}
              onChange={(e) => setXScale(e.target.value as AxisScale)}
              className="bg-raised px-2 py-1 text-sm text-primary"
            >
              {ALL_SCALES.map((s) => (
                <option key={s} value={s}>
                  {scaleLabel(s)}
                </option>
              ))}
            </select>
          </label>
        )}
        {showYScale && (
          <label className="text-sm text-muted">
            Y scale{" "}
            <select
              value={yScale}
              onChange={(e) => setYScale(e.target.value as AxisScale)}
              className="bg-raised px-2 py-1 text-sm text-primary"
            >
              {ALL_SCALES.map((s) => (
                <option key={s} value={s}>
                  {scaleLabel(s)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <ReactECharts
        option={option}
        theme="mountain"
        style={{ height: 320 }}
        onEvents={{ click: handleClick }}
      />
    </div>
  );
}
