export function listResultKeys(project: string, studyNames: string[]): string {
  if (studyNames.length === 0) return "SELECT NULL LIMIT 0";
  const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
  return `
    SELECT DISTINCT key
    FROM results
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name IN (${escaped.join(", ")})
    ORDER BY key
  `;
}
