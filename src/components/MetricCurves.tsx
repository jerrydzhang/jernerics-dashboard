import ReactECharts from "echarts-for-react";
import { useMemo, useState } from "react";

import {
  buildSweepColorMap,
  buildTrialLookup,
  formatNumber,
  shortSweep,
} from "../chartUtils";
import { colors, withAlpha } from "../theme/register";
import {
  type AxisScale,
  applyAxisScale,
  scaleLabel,
} from "../transforms/axisScale";
import type { MetricSeries } from "../transforms/groupMetrics";
import { computePercentileBands } from "../transforms/percentileBands";
import { makeTrialKey, type Trial } from "../trial";

interface MetricCurvesProps {
  series: MetricSeries[];
  trials: Trial[];
  metricKeys: string[];
  selectedMetricKey: string | null;
  onMetricChange: (key: string) => void;
  selectedIds: Set<string>;
  onSelect: (ids: Set<string>) => void;
}

export function MetricCurves({
  series,
  trials,
  metricKeys,
  selectedMetricKey,
  onMetricChange,
  selectedIds,
  onSelect,
}: MetricCurvesProps) {
  const [scale, setScale] = useState<AxisScale>("linear");
  const hasSelection = selectedIds.size > 0;

  // Build a lookup for trial complete status
  const trialLookup = useMemo(() => buildTrialLookup(trials), [trials]);

  // Assign sweep colors
  const sweepNames = useMemo(
    () => [...new Set(series.map((s) => s.studyName))],
    [series],
  );
  const sweepColor = useMemo(
    () => buildSweepColorMap(sweepNames),
    [sweepNames],
  );

  // Per-sweep bands
  const sweepBands = useMemo(() => {
    const grouped = new Map<string, MetricSeries[]>();
    for (const s of series) {
      let arr = grouped.get(s.studyName);
      if (!arr) {
        arr = [];
        grouped.set(s.studyName, arr);
      }
      arr.push(s);
    }
    const result = new Map<
      string,
      {
        steps: number[];
        pLow: (number | null)[];
        p50: (number | null)[];
        pHigh: (number | null)[];
      }
    >();
    for (const [sweep, sweepSeries] of grouped) {
      const raw = computePercentileBands(sweepSeries, 25, 75);
      if (raw.length <= 1) continue;
      result.set(sweep, {
        steps: raw.map((b) => b.step),
        pLow: raw.map((b) => applyAxisScale(b.pLow, scale)),
        p50: raw.map((b) => applyAxisScale(b.p50, scale)),
        pHigh: raw.map((b) => applyAxisScale(b.pHigh, scale)),
      });
    }
    return result;
  }, [series, scale]);

  // Number of band series before trial lines (2 per sweep: band + P50)
  const bandSeriesCount = sweepBands.size * 2;

  const option = useMemo(() => {
    if (series.length === 0) {
      return {
        title: {
          text: selectedMetricKey
            ? "No data for this metric"
            : "Select a metric to view curves",
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

    // Individual trial lines
    const trialLines = series.map((s) => {
      const key = makeTrialKey(s.studyName, s.trialId);
      const trial = trialLookup.get(key);
      const isSelected = hasSelection && selectedIds.has(key);
      const dimOpacity = Math.max(0.02, 0.6 / Math.sqrt(series.length));
      const opacity = hasSelection ? (isSelected ? 1 : dimOpacity) : 0.6;
      const lineWidth = isSelected ? 3 : 1;

      const transformedSteps = s.steps.map((pt) => ({
        step: pt.step,
        value: applyAxisScale(pt.value, scale),
      }));

      return {
        type: "line" as const,
        name: `${s.studyName} T${s.trialId}`,
        data: transformedSteps.map((pt) => [pt.step, pt.value]),
        lineStyle: {
          width: lineWidth,
          type: trial && !trial.complete ? "dashed" : "solid",
          opacity,
        },
        itemStyle: { opacity },
        symbol: "none" as const,
        color: sweepColor.get(s.studyName),
        z: isSelected ? 10 : 1,
        endLabel: {
          show: isSelected,
          formatter: `T${s.trialId}`,
          fontSize: 10,
          color: sweepColor.get(s.studyName),
        },
      };
    });

    return {
      animation: false,
      title: { show: false },
      grid: { left: 40, right: 40, top: 34, bottom: 60 },
      tooltip: {
        trigger: "axis" as const,
        confine: true,
        formatter: (
          params: Array<{
            seriesName: string;
            value: number[];
            seriesIndex: number;
          }>,
        ) => {
          if (!Array.isArray(params)) return "";
          const step = params[0]?.value[0];
          let html = `<div style="font-size:11px">`;
          if (step != null)
            html += `<div style="color:${colors.base03}">step ${step}</div>`;
          let anyBand = false;
          for (const p of params) {
            if (p.seriesIndex < bandSeriesCount) {
              // Band or P50 series — name is "<sweep> P25-P75" or "<sweep> P50"
              const color =
                sweepColor.get(p.seriesName.split(" ")[0] ?? "") ??
                colors.base03;
              const sweepName = p.seriesName.split(" ")[0] ?? "";
              const band = sweepBands.get(sweepName);
              if (!band) continue;
              if (p.seriesName.includes("P50")) {
                html += `<div style="color:${color}">${shortSweep(sweepName)} P50: ${formatNumber(p.value[1])}</div>`;
                anyBand = true;
              } else {
                const stepIdx = band.steps.indexOf(p.value[0] ?? 0);
                if (stepIdx >= 0) {
                  html += `<div style="color:${color}">${shortSweep(sweepName)} P25–P75: ${formatNumber(band.pLow[stepIdx])}–${formatNumber(band.pHigh[stepIdx])}</div>`;
                  anyBand = true;
                }
              }
              continue;
            }
            // Trial lines: only show selected
            const trialIdx = p.seriesIndex - bandSeriesCount;
            const s = series[trialIdx];
            if (!s) continue;
            const key = makeTrialKey(s.studyName, s.trialId);
            if (hasSelection && !selectedIds.has(key)) continue;
            const color = sweepColor.get(s.studyName) ?? colors.base04;
            html += `<div style="color:${color}">T${s.trialId}: ${formatNumber(p.value[1])}</div>`;
          }
          if (!anyBand && !hasSelection) {
            html += `<div style="color:${colors.base03}">${series.length} trials</div>`;
          }
          html += "</div>";
          return html;
        },
      },
      xAxis: {
        type: "value" as const,
        name: "step",
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: { color: colors.base03, fontSize: 11 },
        axisLine: { show: false },
        splitLine: { show: false },
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "none",
        },
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "none",
          height: 18,
          bottom: 8,
          borderColor: "transparent",
          backgroundColor: colors.base01,
          fillerColor: withAlpha(colors.base04, 0.08),
          handleStyle: { color: colors.base03, borderColor: colors.base03 },
          dataBackground: {
            lineStyle: { color: colors.base02 },
            areaStyle: { color: "transparent" },
          },
          selectedDataBackground: {
            lineStyle: { color: colors.base02 },
            areaStyle: { color: "transparent" },
          },
          textStyle: { color: colors.base03, fontSize: 10 },
        },
      ],
      yAxis: {
        type: "value" as const,
        name: selectedMetricKey ?? "",
        nameTextStyle: { color: colors.base03, fontSize: 11 },
        axisLabel: { color: colors.base03, fontSize: 11 },
        axisLine: { lineStyle: { color: colors.base02 } },
        splitLine: { lineStyle: { color: colors.base02, type: "dashed" } },
      },
      series: [
        // Per-sweep bands and P50 lines
        ...[...sweepBands.entries()].flatMap(([sweep, band]) => {
          const color = sweepColor.get(sweep) ?? colors.base04;
          return [
            {
              type: "custom" as const,
              name: `${sweep} P25-P75`,
              renderItem: (
                _params: unknown,
                api: { coord: (data: number[]) => [number, number] },
              ) => {
                const top: [number, number][] = [];
                const bottom: [number, number][] = [];
                for (let i = 0; i < band.steps.length; i++) {
                  top.push(api.coord([band.steps[i] ?? 0, band.pHigh[i] ?? 0]));
                }
                for (let i = band.steps.length - 1; i >= 0; i--) {
                  bottom.push(
                    api.coord([band.steps[i] ?? 0, band.pLow[i] ?? 0]),
                  );
                }
                return {
                  type: "polygon",
                  shape: { points: [...top, ...bottom] },
                  style: { fill: withAlpha(color, 0.4) },
                };
              },
              data: [[0, 0]],
              z: 0,
              silent: true,
            },
            {
              type: "line" as const,
              name: `${sweep} P50`,
              data: band.steps.map((s, i) => [s, band.p50[i] ?? 0]),
              lineStyle: {
                width: 2,
                color,
                type: "dashed" as const,
                opacity: 0.7,
              },
              symbol: "none" as const,
              z: 0,
            },
          ];
        }),
        // Trial lines
        ...trialLines,
      ],
    };
  }, [
    series,
    sweepBands,
    scale,
    selectedIds,
    hasSelection,
    trialLookup,
    sweepColor,
    selectedMetricKey,
    bandSeriesCount,
  ]);

  function handleClick(params: {
    componentType?: string;
    seriesIndex?: number;
  }) {
    if (!params?.componentType || params.componentType !== "series") return;
    if (params.seriesIndex == null) return;
    // Trial lines start after per-sweep band series
    const tidx = params.seriesIndex - bandSeriesCount;
    if (tidx < 0 || tidx >= series.length) return;
    const s = series[tidx];
    if (!s) return;
    const key = makeTrialKey(s.studyName, s.trialId);
    const next = new Set(selectedIds);
    next.has(key) ? next.delete(key) : next.add(key);
    onSelect(next);
  }

  const scales: AxisScale[] = [
    "linear",
    "log",
    "log1p",
    "symlog",
    "negLogOneMinusX",
  ];

  return (
    <div className="bg-surface p-4">
      <div className="mb-3 flex items-center gap-3">
        <select
          value={selectedMetricKey ?? ""}
          onChange={(e) => onMetricChange(e.target.value)}
          className="bg-raised px-2 py-1 text-sm text-primary"
        >
          <option value="" disabled>
            Select metric
          </option>
          {metricKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <select
          value={scale}
          onChange={(e) => setScale(e.target.value as AxisScale)}
          className="bg-raised px-2 py-1 text-sm text-primary"
        >
          {scales.map((s) => (
            <option key={s} value={s}>
              {scaleLabel(s)}
            </option>
          ))}
        </select>
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
