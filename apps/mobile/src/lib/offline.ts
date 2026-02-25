/**
 * Offline support strategy:
 *
 * 1. SQLite (expo-sqlite) for caching key records:
 *    - Assigned jobs + their system specs
 *    - Customer basic info
 *    - Inventory items list
 *    - Manuals list (paths/URLs)
 *
 * 2. MMKV for the write queue:
 *    - Actions performed while offline are stored here
 *    - Background sync replays them when connectivity returns
 *
 * 3. Expo FileSystem for manual PDFs:
 *    - Download on-demand when online
 *    - Cache to local filesystem
 *    - Serve from cache when offline
 *
 * 4. Background sync via expo-background-fetch:
 *    - Runs every 15 minutes
 *    - Syncs the write queue
 *    - Refreshes critical data
 */

import * as SQLite from "expo-sqlite";
import { MMKV } from "react-native-mmkv";
import * as Network from "expo-network";
import * as FileSystem from "expo-file-system";

const db = SQLite.openDatabaseSync("watersys.db");
const storage = new MMKV({ id: "watersys-offline" });

// ─── Offline Queue ─────────────────────────────────────────────

export interface QueuedAction {
  id: string;
  type: string; // "updateTicket" | "logPartUsage" | "addWaterTest" | "createInvoiceDraft" | ...
  payload: unknown;
  createdAt: string;
  retries: number;
}

export function enqueueAction(type: string, payload: unknown): string {
  const id = `action_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const action: QueuedAction = {
    id,
    type,
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  };

  const queue = getQueue();
  queue.push(action);
  storage.set("offlineQueue", JSON.stringify(queue));
  return id;
}

export function getQueue(): QueuedAction[] {
  const raw = storage.getString("offlineQueue");
  return raw ? (JSON.parse(raw) as QueuedAction[]) : [];
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((a) => a.id !== id);
  storage.set("offlineQueue", JSON.stringify(queue));
}

export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected === true && state.isInternetReachable !== false;
}

// ─── Local SQLite Database ─────────────────────────────────────

export function initLocalDb(): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS cached_jobs (
      id TEXT PRIMARY KEY,
      customer_name TEXT,
      site_address TEXT,
      site_city TEXT,
      system_info TEXT,      -- JSON
      checklist TEXT,        -- JSON
      scheduled_start TEXT,
      status TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_customers (
      id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_inventory (
      id TEXT PRIMARY KEY,
      name TEXT,
      part_number TEXT,
      category TEXT,
      unit_of_measure TEXT,
      synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_manuals (
      id TEXT PRIMARY KEY,
      name TEXT,
      dropbox_path TEXT,
      local_path TEXT,
      downloaded_at TEXT
    );
  `);
}

export function cacheJobs(jobs: Array<{
  id: string;
  customerName: string;
  siteAddress: string;
  siteCity: string;
  systemInfo: unknown;
  checklist: unknown;
  scheduledStart: string | null;
  status: string;
}>): void {
  const stmt = db.prepareSync(`
    INSERT OR REPLACE INTO cached_jobs
    (id, customer_name, site_address, site_city, system_info, checklist, scheduled_start, status, synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const job of jobs) {
    stmt.executeSync([
      job.id,
      job.customerName,
      job.siteAddress,
      job.siteCity,
      JSON.stringify(job.systemInfo),
      JSON.stringify(job.checklist),
      job.scheduledStart,
      job.status,
      new Date().toISOString(),
    ]);
  }

  stmt.finalizeSync();
}

export function getCachedJobs(): Array<{
  id: string;
  customer_name: string;
  site_address: string;
  site_city: string;
  system_info: string;
  checklist: string;
  scheduled_start: string | null;
  status: string;
}> {
  return db.getAllSync("SELECT * FROM cached_jobs ORDER BY scheduled_start ASC") as ReturnType<typeof getCachedJobs>;
}

// ─── Manual PDF caching ────────────────────────────────────────

const MANUALS_DIR = `${FileSystem.documentDirectory}manuals/`;

export async function ensureManualsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MANUALS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MANUALS_DIR, { intermediates: true });
  }
}

export async function downloadManual(
  id: string,
  name: string,
  url: string
): Promise<string> {
  await ensureManualsDir();
  const localPath = `${MANUALS_DIR}${id}.pdf`;

  const info = await FileSystem.getInfoAsync(localPath);
  if (info.exists) return localPath;

  await FileSystem.downloadAsync(url, localPath);

  db.runSync(
    `INSERT OR REPLACE INTO cached_manuals (id, name, dropbox_path, local_path, downloaded_at)
     VALUES (?, ?, ?, ?, ?)`,
    [id, name, url, localPath, new Date().toISOString()]
  );

  return localPath;
}

export function getCachedManuals(): Array<{
  id: string;
  name: string;
  local_path: string;
  downloaded_at: string;
}> {
  return db.getAllSync("SELECT * FROM cached_manuals") as ReturnType<typeof getCachedManuals>;
}
