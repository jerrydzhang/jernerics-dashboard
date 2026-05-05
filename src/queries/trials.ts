export interface ObjectiveRow {
  study_name: string;
  trial_id: number;
  trial_number: number;
  objective_value: number;
  completed: boolean;
}

export function listObjectiveData(
  project: string,
  studyNames: string[],
  objectiveKey: string,
): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT
      r.study_name,
      r.trial_id,
      ROW_NUMBER() OVER (PARTITION BY r.study_name ORDER BY r.trial_id) - 1 AS trial_number,
      CAST(r.value AS DOUBLE) AS objective_value,
      te.trial_id IS NOT NULL AS completed
    FROM results r
    LEFT JOIN trial_end te
      ON r.project = te.project
      AND r.study_name = te.study_name
      AND r.trial_id = te.trial_id
    WHERE r.project = '${project.replace(/'/g, "''")}'
      AND r.study_name IN (${escaped.join(", ")})
      AND r.key = '${objectiveKey.replace(/'/g, "''")}'
    ORDER BY r.study_name, r.trial_id
  `;
}
