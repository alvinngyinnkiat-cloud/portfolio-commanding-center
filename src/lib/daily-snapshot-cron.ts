import { getServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";
import { upsertDailySnapshotRow } from "@/core/database/supabase/sync";
import { getSingaporeDateString } from "@/core/calculations/snapshot-schedule";

export interface DailySnapshotCronResult {
  ok: boolean;
  enabled: boolean;
  captured: boolean;
  reason?: string;
  message: string;
  snapshotDate: string;
  date?: string;
  snapshotType?: string;
  ownPortfolio?: number;
  totalPortfolio?: number;
  error?: string;
}

const SUPABASE_REQUIRED_MESSAGE =
  "Automatic daily snapshots require Supabase. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then create the daily_snapshots table from supabase/schema.sql. Vercel Cron cannot write browser localStorage.";

/**
 * Server-side daily snapshot handler for Vercel Cron (15:59 UTC = 11:59 PM SGT).
 * Persists to Supabase daily_snapshots — one row per Singapore calendar date.
 */
export async function runDailySnapshotCron(): Promise<DailySnapshotCronResult> {
  const snapshotDate = getSingaporeDateString();

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      enabled: false,
      captured: false,
      reason: "supabase_required",
      snapshotDate,
      message: SUPABASE_REQUIRED_MESSAGE,
    };
  }

  try {
    const { manager, services } = await createCronRuntime();
    const result = services.snapshots.attemptAutomaticSnapshotCapture(
      new Date(),
      { fromCron: true }
    );

    if (!result.snapshot) {
      await manager.drainSyncQueue();
      return {
        ok: true,
        enabled: true,
        captured: false,
        reason: result.skipReason ?? "unknown",
        snapshotDate: result.snapshotDate,
        message: `Snapshot not captured (${result.skipReason ?? "unknown"}).`,
      };
    }

    const snapshot = result.snapshot;
    const client = getServerSupabaseClient();
    if (client) {
      await upsertDailySnapshotRow(client, snapshot);
    }
    await manager.drainSyncQueue();

    return {
      ok: true,
      enabled: true,
      captured: true,
      snapshotDate: result.snapshotDate,
      date: snapshot.date,
      snapshotType: snapshot.snapshotType,
      ownPortfolio: snapshot.ownPortfolio,
      totalPortfolio: snapshot.totalPortfolio,
      message: `Automatic snapshot saved for ${snapshot.date} (Singapore date).`,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Daily snapshot cron failed";
    return {
      ok: false,
      enabled: true,
      captured: false,
      reason: "error",
      snapshotDate,
      message,
      error: message,
    };
  }
}
