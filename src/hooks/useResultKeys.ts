import { useQuery } from "@tanstack/react-query";

import { query } from "../api/client";
import { listResultKeys } from "../queries/results";

export function useResultKeys(project: string, sweepNames: string[]) {
  return useQuery({
    queryKey: ["resultKeys", project, sweepNames],
    queryFn: async () => {
      if (sweepNames.length === 0) return [];
      const { rows } = await query<{ key: string }>(
        listResultKeys(project, sweepNames),
      );
      return rows.map((r) => r.key);
    },
    enabled: sweepNames.length > 0,
  });
}
