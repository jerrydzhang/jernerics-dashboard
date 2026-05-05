import { useQuery } from "@tanstack/react-query";

import { query } from "../api/client";
import { listProjects, listSweeps, type SweepRow } from "../queries/sweeps";

export interface ProjectInfo {
  project: string;
}

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { rows } = await query<{ project: string }>(listProjects());
      return rows.map((r) => ({ project: r.project }));
    },
  });
}

export interface SweepInfo {
  studyName: string;
  trialCount: number;
  startedDate: Date;
  hasActive: boolean;
}

export function useSweeps(project: string | null) {
  return useQuery({
    queryKey: ["sweeps", project],
    queryFn: async () => {
      if (!project) return [];
      const { rows } = await query<SweepRow>(listSweeps(project));
      return rows.map((r) => ({
        studyName: r.study_name as string,
        trialCount: r.trial_count as number,
        startedDate: new Date((r.started_ns as number) / 1_000_000),
        hasActive: !!r.has_active,
      }));
    },
    enabled: !!project,
  });
}
