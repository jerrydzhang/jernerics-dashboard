const TOKEN_KEY = "jernerics-api-key";

type TokenListener = () => void;
const listeners: Set<TokenListener> = new Set();

export function onTokenCleared(fn: TokenListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  for (const fn of listeners) fn();
}

export async function query<T>(
  sql: string,
): Promise<{ columns: string[]; rows: T[] }> {
  const token = getToken();
  const res = await fetch("/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ sql }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
    }
    throw new Error(`Query failed: ${res.status} ${res.statusText}`);
  }

  const data: { columns: string[]; rows: unknown[][] } = await res.json();
  const rows = data.rows.map((row) =>
    Object.fromEntries(data.columns.map((col, i) => [col, row[i]])),
  ) as T[];

  return { columns: data.columns, rows };
}

export function artifactUrl(
  project: string,
  study: string,
  trialId: number,
  key: string,
): string {
  return `/artifact/${project}/${study}/${trialId}/${key}`;
}
