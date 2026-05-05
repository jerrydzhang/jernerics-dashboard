import { useCallback, useSyncExternalStore } from "react";

export interface ObjectiveEntry {
  key: string;
  direction: "minimize" | "maximize";
}

const STORAGE_PREFIX = "objective:";

function storageKey(project: string): string {
  return `${STORAGE_PREFIX}${project}`;
}

export function getObjective(project: string): ObjectiveEntry[] | null {
  const raw = localStorage.getItem(storageKey(project));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ObjectiveEntry[];
  } catch {
    return null;
  }
}

export function setObjective(project: string, entries: ObjectiveEntry[]): void {
  localStorage.setItem(storageKey(project), JSON.stringify(entries));
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

  let objectives: ObjectiveEntry[] | null = null;
  try {
    objectives = JSON.parse(raw) as ObjectiveEntry[] | null;
  } catch {
    objectives = null;
  }

  const set = useCallback(
    (entries: ObjectiveEntry[]) => {
      if (!project) return;
      setObjective(project, entries);
      window.dispatchEvent(
        new StorageEvent("storage", { key: storageKey(project) }),
      );
    },
    [project],
  );

  const clear = useCallback(() => {
    if (!project) return;
    clearObjective(project);
    window.dispatchEvent(
      new StorageEvent("storage", { key: storageKey(project) }),
    );
  }, [project]);

  return { objectives, set, clear };
}
