export interface MetricSeries {
  studyName: string;
  trialId: number;
  steps: { step: number; value: number }[];
}

interface MetricRow {
  study_name: string;
  trial_id: number;
  step: number;
  value: number;
}

export function groupMetricsByTrial(rows: MetricRow[]): MetricSeries[] {
  const map = new Map<string, MetricSeries>();

  for (const row of rows) {
    const key = `${row.study_name}\0${row.trial_id}`;
    let series = map.get(key);
    if (!series) {
      series = { studyName: row.study_name, trialId: row.trial_id, steps: [] };
      map.set(key, series);
    }
    series.steps.push({ step: row.step, value: row.value });
  }

  return Array.from(map.values());
}
