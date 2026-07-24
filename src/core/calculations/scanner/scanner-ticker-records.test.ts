import { describe, expect, it } from "vitest";
import { upsertTickerRecord, normalizeScannerResultsStore } from "./scanner-ticker-records";

describe("scanner-ticker-records", () => {
  it("does not overwrite newer stored record with older market date", () => {
    const store = normalizeScannerResultsStore({
      latest: null,
      previous: null,
    });

    upsertTickerRecord(store, {
      ticker: "QQQ",
      marketDate: "2026-07-15",
      refreshedAt: "2026-07-15T05:52:00.000Z",
      refreshRunId: "run-b",
      candleCount: 5,
      result: {
        ticker: "QQQ",
        currentPrice: 520,
      } as never,
    });

    const outcome = upsertTickerRecord(store, {
      ticker: "QQQ",
      marketDate: "2026-07-14",
      refreshedAt: "2026-07-14T06:00:00.000Z",
      refreshRunId: "run-a",
      candleCount: 5,
      result: {
        ticker: "QQQ",
        currentPrice: 510,
      } as never,
    });

    expect(outcome).toBe("skipped_stale");
    expect(store.tickerLatestKeys?.QQQ).toContain("2026-07-15");
  });

  it("replaces older ticker records when saving a newer market date", () => {
    const store = normalizeScannerResultsStore({
      latest: null,
      previous: null,
    });

    upsertTickerRecord(store, {
      ticker: "AAPL",
      marketDate: "2026-07-16",
      refreshedAt: "2026-07-16T05:52:00.000Z",
      refreshRunId: "run-old",
      candleCount: 200,
      result: {
        ticker: "AAPL",
        currentPrice: 210,
        priceAsOf: "2026-07-16",
      } as never,
    });

    const outcome = upsertTickerRecord(store, {
      ticker: "AAPL",
      marketDate: "2026-07-23",
      refreshedAt: "2026-07-23T05:52:00.000Z",
      refreshRunId: "run-new",
      candleCount: 200,
      result: {
        ticker: "AAPL",
        currentPrice: 218.5,
        priceAsOf: "2026-07-23",
      } as never,
    });

    expect(outcome).toBe("saved");
    expect(store.tickerLatestKeys?.AAPL).toBe("AAPL|2026-07-23");
    expect(store.tickerRecords?.["AAPL|2026-07-16"]).toBeUndefined();
    expect(store.tickerRecords?.["AAPL|2026-07-23"]?.result.currentPrice).toBe(218.5);
  });
});
