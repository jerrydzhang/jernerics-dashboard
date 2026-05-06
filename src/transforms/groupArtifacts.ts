import { makeTrialKey } from "../trial";

export interface TrialArtifacts {
  studyName: string;
  trialId: number;
  artifacts: { key: string; filename: string }[];
}

interface ArtifactRow {
  study_name: string;
  trial_id: number;
  key: string;
  filename: string;
}

export function groupArtifactsByTrial(rows: ArtifactRow[]): TrialArtifacts[] {
  const map = new Map<string, TrialArtifacts>();

  for (const row of rows) {
    const key = makeTrialKey(row.study_name, row.trial_id);
    let group = map.get(key);
    if (!group) {
      group = {
        studyName: row.study_name,
        trialId: row.trial_id,
        artifacts: [],
      };
      map.set(key, group);
    }
    group.artifacts.push({ key: row.key, filename: row.filename });
  }

  return Array.from(map.values());
}
