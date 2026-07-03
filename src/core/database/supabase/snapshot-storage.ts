import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailySnapshot } from "@/core/domain/types";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import {
  dailySnapshotToRow,
  rowToDailySnapshot,
} from "./daily-snapshot-db";
import { mergeSnapshotsByDate } from "./snapshot-merge";
import {
  formatPersistenceError,
  isMissingSupabaseTableError,
} from "./supabase-errors";
import { isSupabaseConfigured } from "@/lib/supabase";

export interface SnapshotLoadDiagnostics {
  supabaseConfigured: boolean;
  dailyTableReachable: boolean;
  legacyTableReachable: boolean;
  dailyRowCount: number;
  legacyRowCount: number;
  mergedRowCount: number;
  lastFetchError: string | null;
  environment: string;
  supabaseUrlHost: string | null;
}

export interface SnapshotLoadResult {
  snapshots: DailySnapshot[];
  diagnostics: SnapshotLoadDiagnostics;
}

function emptyDiagnostics(): SnapshotLoadDiagnostics {
  return {
    supabaseConfigured: isSupabaseConfigured(),
    dailyTableReachable: false,
    legacyTableReachable: false,
    dailyRowCount: 0,
    legacyRowCount: 0,
    mergedRowCount: 0,
    lastFetchError: null,
    environment: process.env.NODE_ENV ?? "unknown",
    supabaseUrlHost: null,
  };
}

function supabaseHost(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** Load snapshots from daily_snapshots + legacy portfolio_snapshots, merged by date. */
export async function loadDailySnapshots(
  client: SupabaseClient
): Promise<SnapshotLoadResult> {
  const diagnostics = emptyDiagnostics();
  diagnostics.supabaseUrlHost = supabaseHost();

  let daily: DailySnapshot[] = [];
  let legacy: DailySnapshot[] = [];
  const errors: string[] = [];

  const dailyRes = await client
    .from("daily_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: true });

  if (!dailyRes.error) {
    diagnostics.dailyTableReachable = true;
    daily = (dailyRes.data ?? []).map((row) => rowToDailySnapshot(row));
    diagnostics.dailyRowCount = daily.length;
  } else if (isMissingSupabaseTableError(dailyRes.error, "daily_snapshots")) {
    diagnostics.dailyTableReachable = false;
  } else {
    diagnostics.dailyTableReachable = false;
    errors.push(`daily_snapshots: ${formatPersistenceError(dailyRes.error)}`);
  }

  const legacyRes = await client.from("portfolio_snapshots").select("data");
  if (!legacyRes.error) {
    diagnostics.legacyTableReachable = true;
    legacy = (legacyRes.data ?? []).map((row) =>
      normalizeDailySnapshot(row.data)
    );
    diagnostics.legacyRowCount = legacy.length;
  } else if (isMissingSupabaseTableError(legacyRes.error, "portfolio_snapshots")) {
    diagnostics.legacyTableReachable = false;
  } else {
    errors.push(`portfolio_snapshots: ${formatPersistenceError(legacyRes.error)}`);
  }

  const snapshots = mergeSnapshotsByDate([...daily, ...legacy]);
  diagnostics.mergedRowCount = snapshots.length;
  diagnostics.lastFetchError = errors.length > 0 ? errors.join(" · ") : null;

  return { snapshots, diagnostics };
}

export async function probeSnapshotStorage(
  client: SupabaseClient | null
): Promise<SnapshotLoadDiagnostics> {
  if (!client) {
    return {
      ...emptyDiagnostics(),
      lastFetchError: "Supabase client unavailable in this environment",
    };
  }

  const result = await loadDailySnapshots(client);
  return result.diagnostics;
}
