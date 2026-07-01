import { afterEach, describe, expect, it, vi } from "vitest";
import { runDailySnapshotCron } from "./daily-snapshot-cron";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
  getServerSupabaseClient: vi.fn(),
}));

vi.mock("@/core/database/supabase/cron-runtime", () => ({
  createCronRuntime: vi.fn(),
}));

vi.mock("@/core/database/supabase/sync", () => ({
  upsertDailySnapshotRow: vi.fn(),
}));

import { isSupabaseConfigured, getServerSupabaseClient } from "@/lib/supabase";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";
import { upsertDailySnapshotRow } from "@/core/database/supabase/sync";

describe("runDailySnapshotCron", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("requires Supabase for automatic snapshots", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const result = await runDailySnapshotCron();

    expect(result.ok).toBe(false);
    expect(result.enabled).toBe(false);
    expect(result.captured).toBe(false);
    expect(result.reason).toBe("supabase_required");
    expect(result.message).toContain("daily_snapshots");
    expect(createCronRuntime).not.toHaveBeenCalled();
  });

  it("captures and upserts to daily_snapshots when Supabase is configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getServerSupabaseClient).mockReturnValue({} as never);
    vi.mocked(createCronRuntime).mockResolvedValue({
      manager: { drainSyncQueue: vi.fn().mockResolvedValue(undefined) },
      services: {
        snapshots: {
          attemptAutomaticSnapshotCapture: vi.fn().mockReturnValue({
            snapshot: {
              date: "2026-07-01",
              snapshotType: "automatic",
              ownPortfolio: 42_000,
              totalPortfolio: 50_000,
            },
            skipReason: null,
            snapshotDate: "2026-07-01",
          }),
        },
      },
    } as never);

    const result = await runDailySnapshotCron();

    expect(result.ok).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.captured).toBe(true);
    expect(result.date).toBe("2026-07-01");
    expect(upsertDailySnapshotRow).toHaveBeenCalledOnce();
  });
});

describe("daily-snapshot route auth", () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalSecret;
    }
  });

  it("returns 401 without Authorization header", async () => {
    process.env.CRON_SECRET = "test-secret";
    const { GET } = await import("@/app/api/cron/daily-snapshot/route");
    const response = await GET(
      new Request("http://localhost:3000/api/cron/daily-snapshot")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns supabase required message with valid secret when Supabase missing", async () => {
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const { GET } = await import("@/app/api/cron/daily-snapshot/route");
    const response = await GET(
      new Request("http://localhost:3000/api/cron/daily-snapshot", {
        headers: { authorization: "Bearer test-secret" },
      })
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.reason).toBe("supabase_required");
    expect(body.message).toContain("daily_snapshots");
  });
});
