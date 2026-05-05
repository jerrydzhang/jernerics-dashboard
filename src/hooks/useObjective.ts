import { useCallback, useSyncExternalStore } from "react";

export interface ObjectiveEntry {
  key: string;
  direction: "minimize" | "maximize";
}

export interface ObjectiveConfig {
  primary: ObjectiveEntry;
  secondary: ObjectiveEntry | null;
}

const STORAGE_PREFIX = "objective:";

function storageKey(project: string): string {
  return `${STORAGE_PREFIX}${project}`;
}

export function getObjective(project: string): ObjectiveConfig | null {
  const raw = localStorage.getItem(storageKey(project));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ObjectiveConfig;
  } catch {
    return null;
  }
}

export function setObjective(project: string, config: ObjectiveConfig): void {
  localStorage.setItem(storageKey(project), JSON.stringify(config));
}

export function clearObjective(project: string): void {
  localStorage.removeItem(storageKey(project));
}

export function useObjective(project: string | null) {
  const key = project ? storageKey(project) : null;

  const subscribe = useCallback(
    (callback: () => void) => {
      if (!key) return () => {};
      const handler = (e: StorageEvent) => {
        if (e.key === key) callback();
      };
      window.addEventListener("storage", handler);
      return () => window.removeEventListener("storage", handler);
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    if (!key) return "null";
    return localStorage.getItem(key) ?? "null";
  }, [key]);

  const getServerSnapshot = useCallback(() => "null", []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let config: ObjectiveConfig | null = null;
  try {
    config = JSON.parse(raw) as ObjectiveConfig | null;
  } catch {
    config = null;
  }

  const set = useCallback(
    (newConfig: ObjectiveConfig) => {
      if (!project) return;
      setObjective(project, newConfig);
      window.dispatchEvent(
        new StorageEvent("storage", { key: storageKey(project) }),
      );
    },
    [project],
  );

  return { config, set };
}
