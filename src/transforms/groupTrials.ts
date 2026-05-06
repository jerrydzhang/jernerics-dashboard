import type { Trial } from "../trial";
import { makeTrialKey } from "../trial";

export type { Trial };

interface ParamRow {
  study_name: string;
  trial_id: number;
  key: string;
  value: string;
}

interface FinalMetricRow {
  study_name: string;
  trial_id: number;
  key: string;
  value: number;
}

interface StatusRow {
  study_name: string;
  trial_id: number;
  status: string;
}

export function groupTrials(
  params: ParamRow[],
  finalMetrics: FinalMetricRow[],
  status: StatusRow[],
): Trial[] {
  // Build a map keyed by (study_name, trial_id)
  const trialMap = new Map<string, Trial>();

  for (const row of status) {
    const key = makeTrialKey(row.study_name, row.trial_id);
    trialMap.set(key, {
      studyName: row.study_name,
      trialId: row.trial_id,
      params: {},
      finalMetrics: {},
      complete: row.status === "done",
    });
  }

  for (const row of params) {
    const key = makeTrialKey(row.study_name, row.trial_id);
    let trial = trialMap.get(key);
    if (!trial) {
      trial = {
        studyName: row.study_name,
        trialId: row.trial_id,
        params: {},
        finalMetrics: {},
        complete: false,
      };
      trialMap.set(key, trial);
    }
    trial.params[row.key] = row.value;
  }

  for (const row of finalMetrics) {
    const key = makeTrialKey(row.study_name, row.trial_id);
    let trial = trialMap.get(key);
    if (!trial) {
      trial = {
        studyName: row.study_name,
        trialId: row.trial_id,
        params: {},
        finalMetrics: {},
        complete: false,
      };
      trialMap.set(key, trial);
    }
    trial.finalMetrics[row.key] = row.value;
  }

  return Array.from(trialMap.values());
}
