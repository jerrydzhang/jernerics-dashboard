import { useQuery } from "@tanstack/react-query";

import { query } from "../api/client";
import { listFinalMetricKeys } from "../queries/metrics";

export function useFinalMetricKeys(project: string, sweepNames: string[]) {
  return useQuery({
    queryKey: ["finalMetricKeys", project, sweepNames],
    queryFn: async () => {
      if (sweepNames.length === 0) return [];
      const { rows } = await query<{ key: string }>(
        listFinalMetricKeys(project, sweepNames),
      );
      return rows.map((r) => r.key);
    },
    enabled: sweepNames.length > 0,
  });
}
