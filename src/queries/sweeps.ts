/**
 * SQL queries for project and sweep listing.
 *
 * All queries are pure functions returning SQL strings.
 * The API client executes them.
 */

export function listProjects(): string {
  return `
    SELECT DISTINCT project
    FROM params
    ORDER BY project
  `;
}

export interface SweepRow {
  study_name: string;
  trial_count: number;
  started_ns: number;
  has_active: boolean;
}

export function listSweeps(project: string): string {
  return `
    SELECT
      p.study_name,
      COUNT(DISTINCT p.trial_id) AS trial_count,
      MIN(p.timestamp_ns) AS started_ns,
      COUNT(DISTINCT p.trial_id) > COUNT(DISTINCT te.trial_id) AS has_active
    FROM params p
    LEFT JOIN trial_end te
      ON p.project = te.project
      AND p.study_name = te.study_name
      AND p.trial_id = te.trial_id
    WHERE p.project = '${project.replace(/'/g, "''")}'
    GROUP BY p.study_name
    ORDER BY started_ns DESC
  `;
}

export function listSweepMeta(project: string, studyName: string): string {
  return `
    SELECT git_hash, config
    FROM sweep_meta
    WHERE project = '${project.replace(/'/g, "''")}'
      AND study_name = '${studyName.replace(/'/g, "''")}'
    LIMIT 1
  `;
}
