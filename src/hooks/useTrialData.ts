import { useQuery } from "@tanstack/react-query";

import { query } from "../api/client";
import { listTrialArtifacts } from "../queries/artifacts";
import { listMetricData } from "../queries/metrics";
import {
  listTrialParams,
  listTrialResults,
  listTrialStatus,
} from "../queries/trialTable";
import {
  groupArtifactsByTrial,
  type TrialArtifacts,
} from "../transforms/groupArtifacts";
import {
  groupMetricsByTrial,
  type MetricSeries,
} from "../transforms/groupMetrics";
import { groupTrials, type Trial } from "../transforms/groupTrials";

export type { MetricSeries, Trial, TrialArtifacts };

export function useTrialData(project: string, sweepNames: string[]) {
  return useQuery({
    queryKey: ["trialData", project, sweepNames],
    queryFn: async () => {
      if (sweepNames.length === 0) return [];

      const [paramsRes, resultsRes, statusRes] = await Promise.all([
        query<{
          study_name: string;
          trial_id: number;
          key: string;
          value: string;
        }>(listTrialParams(project, sweepNames)),
        query<{
          study_name: string;
          trial_id: number;
          key: string;
          value: number;
        }>(listTrialResults(project, sweepNames)),
        query<{ study_name: string; trial_id: number; status: string }>(
          listTrialStatus(project, sweepNames),
        ),
      ]);

      return groupTrials(paramsRes.rows, resultsRes.rows, statusRes.rows);
    },
    enabled: sweepNames.length > 0,
  });
}

export function useMetricData(
  project: string,
  sweepNames: string[],
  metricKey: string | null,
) {
  return useQuery({
    queryKey: ["metricData", project, sweepNames, metricKey],
    queryFn: async () => {
      if (sweepNames.length === 0 || !metricKey) return [];

      const { rows } = await query<{
        study_name: string;
        trial_id: number;
        step: number;
        value: number;
      }>(listMetricData(project, sweepNames, metricKey));

      return groupMetricsByTrial(rows);
    },
    enabled: sweepNames.length > 0 && !!metricKey,
  });
}

export function useArtifactMeta(
  project: string,
  sweepNames: string[],
  trialData: Trial[] | undefined,
) {
  return useQuery({
    queryKey: ["artifactMeta", project, sweepNames],
    queryFn: async () => {
      if (sweepNames.length === 0 || !trialData) return [];

      // Fetch artifacts for all trials in parallel
      const allArtifacts = await Promise.all(
        trialData.map(async (trial) => {
          const { rows } = await query<{
            study_name: string;
            trial_id: number;
            key: string;
            filename: string;
          }>(listTrialArtifacts(project, trial.studyName, trial.trialId));
          return rows;
        }),
      );

      return groupArtifactsByTrial(allArtifacts.flat());
    },
    enabled: sweepNames.length > 0 && !!trialData && trialData.length > 0,
  });
}
