import { describe, expect, it, vi } from "vitest";
import { ScannerRefreshOrchestrator } from "./scanner-refresh-orchestrator";
import { runScannerManualRefresh } from "./scanner-refresh-service";

function createMockRepos() {
  const store = {
    latest: null,
    previous: null,
    tickerRecords: {},
    tickerLatestKeys: {},
    lastRefreshRun: null,
  };

  return {
    watchlistRepo: {
      get: vi.fn(() => [
        { ticker: "QQQ", market: "US", category: "ETF", active: true },
      ]),
    },
    priceRepo: { list: vi.fn(() => []) },
    dailyRepo: {
      listByTicker: vi.fn(() =>
        Array.from({ length: 200 }, (_, i) => ({
          market: "US" as const,
          ticker: "QQQ",
          date: `2024-${String((i % 12) + 1).padStart(2, "0")}-01`,
          open: 100,
          high: 101,
          low: 99,
          close: 100,
        }))
      ),
    },
    weeklyRepo: { listByTicker: vi.fn(() => []) },
    resultRepo: {
      getLatest: vi.fn(() => store.latest),
      getPrevious: vi.fn(() => store.previous),
      save: vi.fn((run) => {
        store.previous = store.latest;
        store.latest = run;
      }),
      upsertTickerRecord: vi.fn(() => "saved" as const),
      getTickerRecord: vi.fn(() => null),
      getLatestTickerRecord: vi.fn(() => null),
      getAllLatestTickerRecords: vi.fn(() => new Map()),
      getLastRefreshRun: vi.fn(() => store.lastRefreshRun),
      setLastRefreshRun: vi.fn((run) => {
        store.lastRefreshRun = run;
      }),
      verifyTickerRecord: vi.fn(() => true),
      readStore: vi.fn(() => store),
    },
    scheduleRepo: {
      get: vi.fn(() => ({
        lastScanDate: null,
        lastSuccessfulScanTime: null,
        failedRefreshCount: 0,
        lastFailedAttemptDate: null,
      })),
      set: vi.fn(),
    },
    priceScheduleRepo: {
      get: vi.fn(() => ({
        usLastUpdateDate: null,
        sgLastUpdateDate: null,
        usLastCandleUpdateDate: "2026-07-15",
      })),
    },
  };
}

describe("runScannerManualRefresh", () => {
  it("updates candles then runs hardened orchestrator", async () => {
    const repos = createMockRepos();
    const orchestrator = new ScannerRefreshOrchestrator(
      repos.watchlistRepo as never,
      repos.priceRepo as never,
      repos.dailyRepo as never,
      repos.weeklyRepo as never,
      repos.resultRepo as never,
      repos.scheduleRepo as never,
      repos.priceScheduleRepo as never
    );

    const updateCandles = vi.fn(async () => ({
      updated: true,
      symbolsRequested: 1,
      symbolsUpdated: 1,
      symbolsFailed: 0,
    }));

    const result = await runScannerManualRefresh(orchestrator, updateCandles);

    expect(updateCandles).toHaveBeenCalled();
    expect(result.refreshRun.totalTickers).toBeGreaterThan(0);
    expect(["success", "partial_success", "failed"]).toContain(result.metadataStatus);
  });
});
