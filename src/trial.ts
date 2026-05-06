export interface Trial {
  studyName: string;
  trialId: number;
  params: Record<string, string>;
  finalMetrics: Record<string, number>;
  complete: boolean;
}

const SEP = "\0";

export function makeTrialKey(studyName: string, trialId: number): string {
  if (studyName.includes(SEP)) {
    throw new Error(`studyName must not contain null byte: ${studyName}`);
  }
  return `${studyName}${SEP}${trialId}`;
}

export function parseTrialKey(key: string): {
  studyName: string;
  trialId: string;
} {
  const sepIdx = key.indexOf(SEP);
  if (sepIdx === -1) {
    return { studyName: key, trialId: "" };
  }
  return {
    studyName: key.slice(0, sepIdx),
    trialId: key.slice(sepIdx + 1),
  };
}
