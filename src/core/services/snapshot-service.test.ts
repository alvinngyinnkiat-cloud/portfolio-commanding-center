import { describe, expect, it, vi } from "vitest";
import type { DailySnapshot } from "@/core/domain/types";
import { sgtWallTimeToDate } from "@/core/calculations/snapshot-schedule";
import { SnapshotService } from "./snapshot-service";

function makeSnapshot(overrides: Partial<DailySnapshot> = {}): DailySnapshot {
  return {
    date: "2026-06-30",
    createdAt: "2026-06-30T15:59:00.000Z",
    snapshotType: "automatic",
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

  const service = new SnapshotService(
    repo as never,
    aggregator as never
  );

  return { service, repo, aggregator };
}

describe("SnapshotService.attemptAutomaticSnapshotCapture", () => {
  it("skips before 11:59 PM SGT", () => {
    const { service, repo } = createService();
    const result = service.attemptAutomaticSnapshotCapture(
      sgtWallTimeToDate(2026, 6, 30, 12, 0)
    );

    expect(result.snapshot).toBeNull();
    expect(result.skipReason).toBe("before_capture_time");
    expect(result.snapshotDate).toBe("2026-06-30");
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("skips at 12:01 AM SGT without creating that day's snapshot", () => {
    const { service, repo } = createService();
    const result = service.attemptAutomaticSnapshotCapture(
      sgtWallTimeToDate(2026, 6, 30, 0, 1)
    );

    expect(result.snapshot).toBeNull();
    expect(result.skipReason).toBe("before_capture_time");
    expect(repo.upsert).not.toHaveBeenCalled();
  });

  it("creates one automatic snapshot at 11:59 PM SGT", () => {
    const { service, repo } = createService();
    const captureTime = sgtWallTimeToDate(2026, 6, 30, 23, 59);
    const result = service.attemptAutomaticSnapshotCapture(captureTime);

    expect(result.snapshot).not.toBeNull();
    expect(result.skipReason).toBeNull();
    expect(result.snapshot?.date).toBe("2026-06-30");
    expect(result.snapshot?.snapshotType).toBe("automatic");
    expect(repo.upsert).toHaveBeenCalledOnce();
  });

  it("overwrites automatic capture for the same Singapore date", () => {
    const { service, repo } = createService([makeSnapshot()]);
    const result = service.attemptAutomaticSnapshotCapture(
      sgtWallTimeToDate(2026, 6, 30, 23, 59)
    );

    expect(result.snapshot).not.toBeNull();
    expect(result.skipReason).toBeNull();
    expect(result.snapshot?.snapshotType).toBe("automatic");
    expect(repo.upsert).toHaveBeenCalledOnce();
  });

  it("captures from cron without client time-window guard", () => {
    const { service, repo } = createService();
    const result = service.attemptAutomaticSnapshotCapture(
      sgtWallTimeToDate(2026, 6, 30, 12, 0),
      { fromCron: true }
    );

    expect(result.snapshot).not.toBeNull();
    expect(result.skipReason).toBeNull();
    expect(repo.upsert).toHaveBeenCalledOnce();
  });

  it("marks manual captures separately from automatic", () => {
    const { service, repo } = createService();
    const manual = service.captureNow();

    expect(manual?.snapshotType).toBe("manual");
    expect(repo.upsert).toHaveBeenCalledOnce();
  });
});
