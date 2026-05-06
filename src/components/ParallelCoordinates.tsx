import ReactECharts from "echarts-for-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { buildTrialLookup, shortSweep } from "../chartUtils";
import type { ObjectiveEntry } from "../hooks/useObjective";
import { colors } from "../theme/register";
import {
  type AxisScale,
  inverseAxisScale,
  scaleLabel,
} from "../transforms/axisScale";
import { buildParallelData } from "../transforms/parallelData";
import { parseTrialKey, type Trial } from "../trial";

/** Strip the ` [scale]` suffix added by buildParallelData */
function originalAxisName(name: string): string {
  return name.replace(/ \[[^\]]+\]$/, "");
}

const ALL_SCALES: AxisScale[] = [
  "linear",
  "log",
  "log1p",
  "symlog",
  "negLogOneMinusX",
];

interface ParallelCoordinatesProps {
  trials: Trial[];
  objectives: ObjectiveEntry[];
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
}

export function ParallelCoordinates({
  trials,
  objectives,
  selectedIds,
  onSelect,
}: ParallelCoordinatesProps) {
  const [colorIdx, setColorIdx] = useState(0);
  const [axisScales, setAxisScales] = useState<Map<string, AxisScale>>(
    new Map(),
  );
  // Pick first objective for coloring by default, allow switching
  const colorObjective = objectives[colorIdx] ?? objectives[0] ?? null;

  const { axes, data, trialKeys } = useMemo(
    () => buildParallelData(trials, objectives, axisScales),
    [trials, objectives, axisScales],
  );

  // Trial metadata lookup by key for tooltip and incomplete styling
  const trialLookup = useMemo(() => buildTrialLookup(trials), [trials]);

  // Compute objective value range for color mapping
  // Data is already in transformed space; visualMap maps gradient in that space
  // Text labels are inverse-transformed to show original values
  const colorRange = useMemo(() => {
    if (!colorObjective || data.length === 0) return null;
    const objAxis = axes.find(
      (a) => originalAxisName(a.name) === colorObjective.key,
    );
    if (!objAxis) return null;
    const dim = objAxis.dim;
    const values = data
      .map((row) => row[dim])
      .filter((v): v is number => !Number.isNaN(v));
    if (values.length === 0) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const colorScale = axisScales.get(colorObjective.key) ?? "linear";
    return {
      min,
      max,
      dim,
      colorScale,
      textHigh:
        colorScale !== "linear" ? inverseAxisScale(max, colorScale) : max,
      textLow:
        colorScale !== "linear" ? inverseAxisScale(min, colorScale) : min,
    };
  }, [axes, data, colorObjective, axisScales]);

  const option = useMemo(() => {
    if (data.length === 0) {
      return {
        title: {
          text:
            objectives.length > 0
              ? "No trials to display"
              : "Configure objectives to see parallel coordinates",
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

    const seriesData = data.map((row, i) => {
      const key = trialKeys[i] ?? "";
      const trial = trialLookup.get(key);
      return {
        value: row,
        key,
        trialId: trial?.trialId,
        sweepName: trial?.studyName,
        complete: trial?.complete ?? true,
      };
    });

    const hasSelection = selectedIds.size > 0;

    return {
      animation: false,
      parallel: {
        left: 60,
        right: 80,
        top: 30,
        bottom: 20,
      },
      parallelAxis: axes.map((axis) => ({
        dim: axis.dim,
        name: axis.name,
        type: axis.type,
        ...(axis.type === "category" ? { data: axis.data } : {}),
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: {
          color: colors.base03,
          fontSize: 11,
          formatter: axis.tickFormatter
            ? (value: number) => axis.tickFormatter?.(value)
            : undefined,
        },
      })),
      visualMap: colorRange
        ? {
            show: true,
            dimension: colorRange.dim,
            min: colorRange.min,
            max: colorRange.max,
            text: [String(colorRange.textHigh), String(colorRange.textLow)],
            textStyle: { color: colors.base03, fontSize: 10 },
            inRange: {
              color: ["#440154", "#21908c", "#fde725"],
            },
            right: 0,
            top: "center",
            itemHeight: 120,
          }
        : undefined,
      tooltip: {
        show: true,
        trigger: "item",
        confine: true,
        formatter: (params: Record<string, unknown>) => {
          const d = params.data as
            | {
                key?: string;
                trialId?: number;
                sweepName?: string;
              }
            | undefined;
          if (!d?.key) return "";
          const parts = parseTrialKey(d.key);
          const tId = parts.trialId || "?";
          const sweep = d.sweepName ?? parts.studyName ?? "";
          const short = shortSweep(sweep);
          return `<div style="font-size:11px"><div style="color:${colors.base04}">${short ? `${short} ` : ""}Trial ${tId}</div></div>`;
        },
      },
      series: [
        {
          type: "parallel",
          data: hasSelection
            ? seriesData.map((item) => ({
                value: item.value,
                key: item.key,
                trialId: item.trialId,
                sweepName: item.sweepName,
                complete: item.complete,
                lineStyle: {
                  opacity: selectedIds.has(item.key) ? 1 : 0.08,
                  width: selectedIds.has(item.key) ? 2 : 1,
                  type: item.complete ? "solid" : "dashed",
                },
              }))
            : seriesData.map((item) => ({
                value: item.value,
                key: item.key,
                trialId: item.trialId,
                sweepName: item.sweepName,
                complete: item.complete,
                lineStyle: {
                  opacity: 1,
                  width: 2,
                  type: item.complete ? "solid" : "dashed",
                },
              })),
          inactiveOpacity: 0.05,
          activeOpacity: 1,
          smooth: false,
          realtime: true,
        },
      ],
    };
  }, [
    axes,
    data,
    trialKeys,
    selectedIds,
    colorRange,
    objectives.length,
    trialLookup,
  ]);

  const chartRef = useRef<ReactECharts>(null);

  function handleAxisAreaSelected() {
    const chart = chartRef.current?.getEchartsInstance();
    if (!chart) return;

    // getRawIndicesByActiveState returns data indices of brushed (active) trials
    const seriesModel = (
      chart as unknown as {
        getModel: () => {
          getSeriesByIndex: (i: number) => {
            getRawIndicesByActiveState: (state: string) => number[];
          } | null;
        };
      }
    )
      .getModel()
      .getSeriesByIndex(0);
    if (!seriesModel) return;
    const rawIndices = seriesModel.getRawIndicesByActiveState("active");

    const filtered = new Set<string>();
    for (const idx of rawIndices) {
      const key = trialKeys[idx];
      if (key) filtered.add(key);
    }
    onSelect(filtered);
  }

  const [showScalePanel, setShowScalePanel] = useState(false);
  const scalePanelRef = useRef<HTMLDivElement>(null);

  const numericAxes = axes.filter((a) => a.type === "value");

  function handleScaleChange(axisName: string, scale: AxisScale) {
    setAxisScales((prev) => {
      const next = new Map(prev);
      if (scale === "linear") {
        next.delete(axisName);
      } else {
        next.set(axisName, scale);
      }
      return next;
    });
  }

  // Dismiss scale panel on outside click
  useEffect(() => {
    if (!showScalePanel) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        scalePanelRef.current &&
        !scalePanelRef.current.contains(e.target as Node)
      ) {
        setShowScalePanel(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showScalePanel]);

  if (data.length === 0) {
    return (
      <div className="bg-surface p-4">
        <ReactECharts
          option={option}
          theme="mountain"
          style={{ height: 300 }}
        />
      </div>
    );
  }

  return (
    <div className="bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        {objectives.length > 1 && (
          <label className="text-sm text-muted">
            Color by{" "}
            <select
              value={colorIdx}
              onChange={(e) => setColorIdx(Number(e.target.value))}
              className="bg-raised px-2 py-1 text-sm text-primary"
            >
              {objectives.map((o, i) => (
                <option key={o.key} value={i}>
                  {o.key}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="relative" ref={scalePanelRef}>
          <button
            type="button"
            className="bg-raised px-2 py-1 text-sm text-primary"
            onClick={() => setShowScalePanel((v) => !v)}
          >
            Scale{axisScales.size > 0 ? ` (${axisScales.size})` : ""}
          </button>
          {showScalePanel && (
            <div className="absolute left-0 top-full z-10 mt-1 min-w-[180px] bg-raised p-2">
              {numericAxes.map((axis) => {
                const origName = originalAxisName(axis.name);
                const currentScale = axisScales.get(origName) ?? "linear";
                return (
                  <label
                    key={origName}
                    className="flex items-center justify-between gap-2 py-0.5 text-sm"
                  >
                    <span className="text-muted truncate">{origName}</span>
                    <select
                      value={currentScale}
                      onChange={(e) =>
                        handleScaleChange(origName, e.target.value as AxisScale)
                      }
                      className="bg-deep px-1 py-0.5 text-xs text-primary"
                    >
                      {ALL_SCALES.map((s) => (
                        <option key={s} value={s}>
                          {scaleLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <ReactECharts
        ref={chartRef}
        option={option}
        theme="mountain"
        style={{ height: 300 }}
        onEvents={{ axisAreaSelected: handleAxisAreaSelected }}
      />
    </div>
  );
}
