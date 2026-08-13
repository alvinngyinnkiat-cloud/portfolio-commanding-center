import { describe, expect, it, vi } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import { sgtWallTimeToDate } from "@/core/calculations/snapshot-schedule";
import { SnapshotService } from "./snapshot-service";

function makeSnapshot(overrides: Partial<DailySnapshot> = {}): DailySnapshot {
  return {
    date: "2026-06-30",
    createdAt: "2026-06-30T15:59:00.000Z",
    snapshotType: "manual",
    ownPortfolio: 10_000,
    totalPortfolio: 12_000,
    clientPortfolio: 2_000,
    totalContribution: 8_000,
    usStocksEtfSgd: 4_000,
    sgStocksSgd: 2_000,
    cryptoSgd: 1_000,
    personalCashSgd: 3_000,
    cashSgd: 3_000,
    fxRateUsed: 1.35,
    ...overrides,
  };
}

function createService(existing: DailySnapshot[] = []) {
  const repo = {
    list: vi.fn(() => existing),
    upsert: vi.fn(),
    upsertLocalOnly: vi.fn(),
    delete: vi.fn(),
    replaceAll: vi.fn(),
  };
  const aggregator = {
    getPortfolioState: vi.fn(() => ({
      fxRateValid: true,
      inputs: { fxRate: 1.35, netOptionsMarketValueSgd: 0 },
      metrics: {
        ownPortfolio: 10_000,
        totalPortfolio: 12_000,
        clientPortfolio: 2_000,
        totalContribution: 8_000,
        usStocksEtfSgd: 4_000,
        sgStocksSgd: 2_000,
        cryptoHoldingsValueSgd: 1_000,
        totalCashSgd: 3_000,
      },
    })),
  };

  const service = new SnapshotService(repo as never, aggregator as never);
  return { service, repo, aggregator };
}

describe("SnapshotService", () => {
  it("captures manual snapshot for today in Singapore time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(sgtWallTimeToDate(2026, 6, 30, 12, 0));

    const { service, repo } = createService();
    const manual = service.captureNow();

    expect(manual?.snapshotType).toBe("manual");
    expect(manual?.date).toBe("2026-06-30");
    expect(repo.upsert).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("imports snapshots deduped by date", () => {
    const { service, repo } = createService([makeSnapshot()]);
    const imported = service.importSnapshots([
      makeSnapshot({
        date: "2026-06-30",
        createdAt: "2026-06-30T16:00:00.000Z",
        ownPortfolio: 11_000,
      }),
      makeSnapshot({ date: "2026-07-01" }),
    ]);

    expect(imported).toHaveLength(2);
    expect(repo.replaceAll).toHaveBeenCalledOnce();
  });

  it("captureNowAsync saves to Supabase then updates local cache only", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sgtWallTimeToDate(2026, 6, 30, 12, 0));

    const { service, repo } = createService();
    const saveToSupabase = vi.fn(async (snapshot: DailySnapshot) => ({
      ...snapshot,
      ownPortfolio: 10_500,
    }));

    const result = await service.captureNowAsync({ saveToSupabase });

    expect(result?.savedToSupabase).toBe(true);
    expect(result?.snapshot.ownPortfolio).toBe(10_500);
    expect(saveToSupabase).toHaveBeenCalledOnce();
    expect(repo.upsertLocalOnly).toHaveBeenCalledOnce();
    expect(repo.upsert).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("captureNowAsync falls back to local cache when Supabase fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sgtWallTimeToDate(2026, 6, 30, 12, 0));

    const { service, repo } = createService();
    const result = await service.captureNowAsync({
      saveToSupabase: async () => {
        throw new Error("RLS policy violation");
      },
    });

    expect(result?.savedToSupabase).toBe(false);
    expect(result?.supabaseError).toBe("RLS policy violation");
    expect(repo.upsertLocalOnly).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });
});
