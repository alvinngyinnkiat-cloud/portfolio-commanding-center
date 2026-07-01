import { afterEach, describe, expect, it, vi } from "vitest";
import { runDailySnapshotCron } from "./daily-snapshot-cron";

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: vi.fn(),
}));

vi.mock("@/core/database/supabase/cron-runtime", () => ({
  createCronRuntime: vi.fn(),
}));

import { isSupabaseConfigured } from "@/lib/supabase";
import { createCronRuntime } from "@/core/database/supabase/cron-runtime";

describe("runDailySnapshotCron", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns disabled message when Supabase is not configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const result = await runDailySnapshotCron();

    expect(result.ok).toBe(true);
    expect(result.enabled).toBe(false);
    expect(result.captured).toBe(false);
    expect(result.reason).toBe("server_storage_required");
    expect(result.message).toContain("localStorage");
    expect(result.message).toContain("Supabase");
    expect(createCronRuntime).not.toHaveBeenCalled();
  });

  it("captures snapshot when Supabase is configured", async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(createCronRuntime).mockResolvedValue({
      manager: { drainSyncQueue: vi.fn().mockResolvedValue(undefined) },
      services: {
        snapshots: {
          attemptAutomaticSnapshotCapture: vi.fn().mockReturnValue({
            snapshot: {
              date: "2026-06-30",
              snapshotType: "automatic",
              ownPortfolio: 42_000,
              totalPortfolio: 50_000,
            },
            skipReason: null,
            snapshotDate: "2026-06-30",
          }),
        },
      },
    } as never);

    const result = await runDailySnapshotCron();

    expect(result.ok).toBe(true);
    expect(result.enabled).toBe(true);
    expect(result.captured).toBe(true);
    expect(result.date).toBe("2026-06-30");
    expect(result.message).toContain("captured");
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

  it("returns clear disabled message with valid secret when Supabase missing", async () => {
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);

    const { GET } = await import("@/app/api/cron/daily-snapshot/route");
    const response = await GET(
      new Request("http://localhost:3000/api/cron/daily-snapshot", {
        headers: { authorization: "Bearer test-secret" },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.enabled).toBe(false);
    expect(body.message).toContain("Supabase");
  });
});
