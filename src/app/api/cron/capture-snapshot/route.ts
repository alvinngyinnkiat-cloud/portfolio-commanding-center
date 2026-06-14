import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";

export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { manager, services } = await createCronRuntime();
    const snapshot = services.snapshots.captureEndOfDayForDate();

    await manager.drainSyncQueue();

    if (!snapshot) {
      return NextResponse.json({
        ok: true,
        captured: false,
        reason: "already_captured_or_invalid_state",
      });
    }

    return NextResponse.json({
      ok: true,
      captured: true,
      date: snapshot.date,
      snapshotType: snapshot.snapshotType,
      ownPortfolio: snapshot.ownPortfolio,
      totalPortfolio: snapshot.totalPortfolio,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Snapshot cron job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
