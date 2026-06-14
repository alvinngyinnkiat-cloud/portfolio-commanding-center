import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";

export const maxDuration = 300;

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { manager, services } = await createCronRuntime();
    const result = await services.refreshScannerNow();

    await manager.drainSyncQueue();

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      candleResult: result.candleResult,
      scanDate: result.scanRun.scanDate,
      tickersScanned: result.scanRun.tickersScanned,
      refreshStatus: result.scanRun.refreshStatus,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scanner cron job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
