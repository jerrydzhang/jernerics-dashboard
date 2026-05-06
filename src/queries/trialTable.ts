export function listTrialStatus(project: string, studyNames: string[]): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT DISTINCT
      p.study_name,
      p.trial_id,
      CASE WHEN te.trial_id IS NOT NULL THEN 'done' ELSE 'unknown' END AS status
    FROM params p
    LEFT JOIN trial_end te
      ON p.project = te.project
      AND p.study_name = te.study_name
      AND p.trial_id = te.trial_id
    WHERE p.project = '${project.replace(/'/g, "''")}'
      AND p.study_name IN (${escaped.join(", ")})
    ORDER BY p.study_name, p.trial_id
  `;
}

export function listTrialParams(project: string, studyNames: string[]): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT study_name, trial_id, key,
      COALESCE(
        CAST(float_val AS VARCHAR),
        CAST(int_val AS VARCHAR),
        string_val,
        CAST(bool_val AS VARCHAR)
      ) AS value
    FROM params
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
    ORDER BY study_name, trial_id, key
  `;
}

export function listObjectiveValues(
  project: string,
  studyNames: string[],
  objectiveKey: string,
): string {
  if (studyNames.length === 0 || !objectiveKey) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT study_name, trial_id, value AS objective_value
    FROM metrics
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
      AND key = '${objectiveKey.replace(/'/g, "''")}'
      AND step IS NULL
    ORDER BY study_name, trial_id
  `;
}
