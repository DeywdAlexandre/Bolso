import { loadJson, saveJson, STORAGE_KEYS } from "./storage";

export type Snapshot = {
  id: string;
  createdAt: string;
  reason: "auto" | "before_import";
  json: string;
};

const MAX_SNAPSHOTS = 3;
const AUTO_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export async function listSnapshots(): Promise<Snapshot[]> {
  return loadJson<Snapshot[]>(STORAGE_KEYS.snapshots, []);
}

/** Guarda uma cópia local dos dados, mantendo só as últimas {@link MAX_SNAPSHOTS}. */
export async function saveSnapshot(json: string, reason: Snapshot["reason"]): Promise<Snapshot> {
  const snapshot: Snapshot = {
    id: Date.now().toString(36),
    createdAt: new Date().toISOString(),
    reason,
    json,
  };
  const current = await listSnapshots();
  await saveJson(STORAGE_KEYS.snapshots, [snapshot, ...current].slice(0, MAX_SNAPSHOTS));
  return snapshot;
}

/** Cria um snapshot automático se o último tiver mais de 7 dias. */
export async function maybeAutoSnapshot(getJson: () => Promise<string>): Promise<void> {
  const current = await listSnapshots();
  const last = current.find((s) => s.reason === "auto");
  if (last && Date.now() - new Date(last.createdAt).getTime() < AUTO_INTERVAL_MS) return;
  await saveSnapshot(await getJson(), "auto");
}
