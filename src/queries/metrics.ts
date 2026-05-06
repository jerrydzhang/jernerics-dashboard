export function listMetricKeys(project: string, studyNames: string[]): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT DISTINCT key
    FROM metrics
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
    ORDER BY key
  `;
}

export function listFinalMetricKeys(
  project: string,
  studyNames: string[],
): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT DISTINCT key
    FROM metrics
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
      AND step IS NULL
    ORDER BY key
  `;
}

export interface MetricRow {
  study_name: string;
  trial_id: number;
  step: number;
  value: number;
}

export function listFinalMetrics(
  project: string,
  studyNames: string[],
): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT study_name, trial_id, key, value
    FROM metrics
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
      AND step IS NULL
    ORDER BY study_name, trial_id, key
  `;
}

export function listMetricData(
  project: string,
  studyNames: string[],
  metricKey: string,
): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT study_name, trial_id, step, value
    FROM metrics
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
      AND key = '${metricKey.replace(/'/g, "''")}'
    ORDER BY study_name, trial_id, step
  `;
}
