import { isSupabaseConfigured } from "@/lib/supabase";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";
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

const DISABLED_MESSAGE =
  "Automatic daily snapshots are disabled. Vercel Cron runs on the server and cannot write browser localStorage. Configure Supabase (portfolio_snapshots table) to enable auto capture at 11:59 PM SGT (15:59 UTC). Manual Capture Snapshot in Settings still saves to localStorage in the browser.";

/**
 * Server-side daily snapshot handler for Vercel Cron.
 * Uses Supabase when configured; otherwise returns a clear disabled response (Option B).
 */
export async function runDailySnapshotCron(): Promise<DailySnapshotCronResult> {
  const snapshotDate = getSingaporeDateString();

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      enabled: false,
      captured: false,
      reason: "server_storage_required",
      snapshotDate,
      message: DISABLED_MESSAGE,
    };
  }

  try {
    const { manager, services } = await createCronRuntime();
    const result = services.snapshots.attemptAutomaticSnapshotCapture();
    await manager.drainSyncQueue();

    if (!result.snapshot) {
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
    return {
      ok: true,
      enabled: true,
      captured: true,
      snapshotDate: result.snapshotDate,
      date: snapshot.date,
      snapshotType: snapshot.snapshotType,
      ownPortfolio: snapshot.ownPortfolio,
      totalPortfolio: snapshot.totalPortfolio,
      message: `Automatic snapshot captured for ${snapshot.date}.`,
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
