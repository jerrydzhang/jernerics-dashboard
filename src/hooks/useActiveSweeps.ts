import { useQuery } from "@tanstack/react-query";

import { query } from "../api/client";

interface ActiveSweepRow {
  study_name: string;
  has_active: boolean;
}

/**
 * Check which of the selected sweeps have active (still running) trials.
 * Returns a Set of study names that are active, or null if no sweeps selected.
 */
export function useActiveSweeps(project: string | null, studyNames: string[]) {
  return useQuery({
    queryKey: ["activeSweeps", project, studyNames],
    queryFn: async () => {
      if (!project || studyNames.length === 0) return new Set<string>();

      const escaped = studyNames.map((s) => `'${s.replace(/'/g, "''")}'`);
      const sql = `
        SELECT p.study_name, COUNT(DISTINCT p.trial_id) > COUNT(DISTINCT te.trial_id) AS has_active
        FROM params p
        LEFT JOIN trial_end te
          ON p.project = te.project
          AND p.study_name = te.study_name
          AND p.trial_id = te.trial_id
        WHERE p.project = '${project.replace(/'/g, "''")}'
          AND p.study_name IN (${escaped.join(", ")})
        GROUP BY p.study_name
      `;
      const { rows } = await query<ActiveSweepRow>(sql);
      const active = new Set<string>();
      for (const row of rows) {
        if (row.has_active) active.add(row.study_name as string);
      }
      return active;
    },
    enabled: !!project && studyNames.length > 0,
    refetchInterval: (query) => {
      // Poll every 10s if there are active sweeps
      if (query.state.data && query.state.data.size > 0) return 10_000;
      return false;
    },
  });
}
