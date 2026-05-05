/**
 * Parse a jernerics study name into display components.
 *
 * Study name format: `{project}_{config_stem}_{timestamp_ns}`
 * The last underscore-delimited segment is always the nanosecond timestamp.
 * Everything before it is `project_config_stem`, split at the first underscore.
 */
export function parseStudyName(studyName: string): {
  project: string;
  configStem: string;
  timestampNs: number;
  startedDate: Date;
} | null {
  const lastUnderscore = studyName.lastIndexOf("_");
  if (lastUnderscore === -1) return null;

  const prefix = studyName.slice(0, lastUnderscore);
  const timestampStr = studyName.slice(lastUnderscore + 1);

  const timestampNs = Number(timestampStr);
  if (!timestampStr || Number.isNaN(timestampNs)) return null;

  const firstUnderscore = prefix.indexOf("_");
  if (firstUnderscore === -1) return null;

  const project = prefix.slice(0, firstUnderscore);
  const configStem = prefix.slice(firstUnderscore + 1);

  if (!project || !configStem) return null;

  const startedDate = new Date(timestampNs / 1_000_000);

  return { project, configStem, timestampNs, startedDate };
}

/** Format a sweep's display name: "configStem" when unambiguous, "configStem M/D/YYYY" when not. */
export function formatDisplayName(
  configStem: string,
  date: Date,
  ambiguous = true,
): string {
  if (!ambiguous) return configStem;
  return `${configStem} ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
