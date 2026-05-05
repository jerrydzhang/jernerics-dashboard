export interface ArtifactRow {
  study_name: string;
  trial_id: number;
  key: string;
  filename: string;
}

export function listTrialArtifacts(
  project: string,
  studyName: string,
  trialId: number,
): string {
  return `
    SELECT study_name, trial_id, key, filename
    FROM artifacts
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name = '${studyName.replace(/'/g, "''")}'
      AND trial_id = ${trialId}
    ORDER BY key
  `;
}
