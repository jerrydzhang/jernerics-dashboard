export interface Trial {
  studyName: string;
  trialId: number;
  params: Record<string, string>;
  results: Record<string, number>;
  complete: boolean;
}

interface ParamRow {
  study_name: string;
  trial_id: number;
  key: string;
  value: string;
}

interface ResultRow {
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
  results: ResultRow[],
  status: StatusRow[],
): Trial[] {
  // Build a map keyed by (study_name, trial_id)
  const trialMap = new Map<string, Trial>();

  for (const row of status) {
    const key = `${row.study_name}\0${row.trial_id}`;
    trialMap.set(key, {
      studyName: row.study_name,
      trialId: row.trial_id,
      params: {},
      results: {},
      complete: row.status === "done",
    });
  }

  for (const row of params) {
    const key = `${row.study_name}\0${row.trial_id}`;
    let trial = trialMap.get(key);
    if (!trial) {
      trial = {
        studyName: row.study_name,
        trialId: row.trial_id,
        params: {},
        results: {},
        complete: false,
      };
      trialMap.set(key, trial);
    }
    trial.params[row.key] = row.value;
  }

  for (const row of results) {
    const key = `${row.study_name}\0${row.trial_id}`;
    let trial = trialMap.get(key);
    if (!trial) {
      trial = {
        studyName: row.study_name,
        trialId: row.trial_id,
        params: {},
        results: {},
        complete: false,
      };
      trialMap.set(key, trial);
    }
    trial.results[row.key] = row.value;
  }

  return Array.from(trialMap.values());
}
