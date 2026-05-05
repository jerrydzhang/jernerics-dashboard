import ReactECharts from "echarts-for-react";
import { useMemo, useRef, useState } from "react";

import type { ObjectiveEntry } from "../hooks/useObjective";
import type { Trial } from "../transforms/groupTrials";
import { buildParallelData } from "../transforms/parallelData";

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
  // Pick first objective for coloring by default, allow switching
  const colorObjective = objectives[colorIdx] ?? objectives[0] ?? null;

  const { axes, data, trialKeys } = useMemo(
    () => buildParallelData(trials, objectives),
    [trials, objectives],
  );

  // Trial metadata lookup by key for tooltip and incomplete styling
  const trialLookup = useMemo(() => {
    const map = new Map<string, Trial>();
    for (const t of trials) {
      map.set(`${t.studyName}\0${t.trialId}`, t);
    }
    return map;
  }, [trials]);

  // Compute objective value range for color mapping
  const colorRange = useMemo(() => {
    if (!colorObjective || data.length === 0) return null;
    const objAxis = axes.find((a) => a.name === colorObjective.key);
    if (!objAxis) return null;
    const dim = objAxis.dim;
    const values = data
      .map((row) => row[dim])
      .filter((v): v is number => !Number.isNaN(v));
    if (values.length === 0) return null;
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      dim,
    };
  }, [axes, data, colorObjective]);

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
            color: "#6d6562",
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
        nameTextStyle: { color: "#6d6562", fontSize: 11 },
        axisLabel: { color: "#6d6562", fontSize: 11 },
      })),
      visualMap: colorRange
        ? {
            show: true,
            dimension: colorRange.dim,
            min: colorRange.min,
            max: colorRange.max,
            text: [String(colorRange.max), String(colorRange.min)],
            textStyle: { color: "#6d6562", fontSize: 10 },
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
          const parts = d.key.split("\0");
          const tId = parts[1] ?? "?";
          const sweep = d.sweepName ?? parts[0] ?? "";
          const short = shortSweep(sweep);
          return `<div style="font-size:11px"><div style="color:#c4a6a8">${short ? `${short} ` : ""}Trial ${tId}</div></div>`;
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

function shortSweep(name: string): string {
  const idx = name.lastIndexOf("_");
  if (idx < 0) return name;
  return name.slice(0, idx);
}
