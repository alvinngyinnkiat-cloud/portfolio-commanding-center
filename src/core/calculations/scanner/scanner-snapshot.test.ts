import { describe, expect, it } from "vitest";
import {
  buildLatestScannerRecordMap,
  getLatestScannerRecordFromRuns,
} from "./scanner-snapshot";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";

function makeResult(
  ticker: string,
  currentPrice: number,
  priceAsOf: string
): ScannerTickerResult {
  return {
    ticker,
    category: "ETF",
    market: "US",
    currentPrice,
    priceAsOf,
    indicators: {
      ema20: 100,
      ema20Prev: null,
      sma50: 100,
      sma50Prev: null,
      sma50SlopePct: null,
      sma200: 100,
      sma200Prev: null,
      atr14: 5,
      so: 50,
      soPrev: null,
      soStatus: "Strong",
      high: currentPrice,
      low: currentPrice - 1,
      avgPrice: currentPrice,
      avgPricePrev: currentPrice - 1,
      emaDiff: 0,
      emaDiffPct: 0,
      marketStructure: "Bullish",
      momentum: "Above EMA",
      trend: "Bullish",
      trendQualityScore: 1,
    },
    structure: {
      dailySupport: null,
      weeklySupport: null,
      primarySupport: null,
      dailyResistance: null,
      weeklyResistance: null,
      primaryResistance: null,
      midPrice: null,
      rangeWidth: null,
      sellPutRange: null,
      sellCallRange: null,
      icMidZone: null,
    },
    strategies: {
      bullPut: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      bearCall: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      ironCondor: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
    },
    emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },
    mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },
    bestSetup: null,
    tradable: false,
    tradeReasons: [],
    recentCandles: [],
    status: "ok",
    notes: [],
  };
}

function makeRun(
  id: string,
  scanTime: string,
  scanDate: string,
  results: ScannerTickerResult[]
): ScannerScanRun {
  return {
    id,
    scanDate,
    scanTime,
    marketDateUsed: scanDate,
    refreshStatus: "success",
    tickersScanned: results.length,
    tickersMissing: [],
    results,
    rankings: { bullPut: [], bearCall: [], ironCondor: [] },
    opportunities: { bullPut: 0, bearCall: 0, ironCondor: 0 },
    health: {
      dataSourceStatus: "healthy",
      lastSuccessfulRefresh: scanTime,
      failedRefreshCount: 0,
      indicatorsCalculated: results.length,
      missingTickers: [],
    },
  };
}

describe("scanner-snapshot", () => {
  it("selects newest market date per ticker across runs", () => {
    const latest = makeRun("run-b", "2026-07-15T05:52:00.000Z", "2026-07-15", [
      makeResult("QQQ", 520, "2026-07-15"),
    ]);
    const previous = makeRun("run-a", "2026-07-14T06:00:00.000Z", "2026-07-14", [
      makeResult("QQQ", 510, "2026-07-14"),
    ]);

    const record = getLatestScannerRecordFromRuns([latest, previous], "QQQ");
    expect(record?.currentPrice).toBe(520);
    expect(record?.marketDate).toBe("2026-07-15");
    expect(record?.isTickerStale).toBe(false);
  });

  it("falls back to previous run when ticker missing from latest run", () => {
    const latest = makeRun("run-b", "2026-07-15T05:52:00.000Z", "2026-07-15", [
      makeResult("AVGO", 200, "2026-07-15"),
    ]);
    const previous = makeRun("run-a", "2026-07-14T06:00:00.000Z", "2026-07-14", [
      makeResult("VRT", 140, "2026-07-14"),
    ]);

    const map = buildLatestScannerRecordMap([latest, previous]);
    expect(map.get("AVGO")?.currentPrice).toBe(200);
    expect(map.get("VRT")?.currentPrice).toBe(140);
    expect(map.get("VRT")?.isTickerStale).toBe(true);
  });

  it("normalizes ticker keys", () => {
    const latest = makeRun("run-b", "2026-07-15T05:52:00.000Z", "2026-07-15", [
      makeResult(" Qqq ", 520, "2026-07-15"),
    ]);

    const record = getLatestScannerRecordFromRuns([latest], "qqq");
    expect(record?.ticker).toBe("QQQ");
  });

  it("prefers newer refreshedAt when market dates tie", () => {
    const newer = makeRun("run-b", "2026-07-15T05:52:00.000Z", "2026-07-15", [
      makeResult("VRT", 145, "2026-07-14"),
    ]);
    const older = makeRun("run-a", "2026-07-14T06:00:00.000Z", "2026-07-14", [
      makeResult("VRT", 140, "2026-07-14"),
    ]);

    const record = getLatestScannerRecordFromRuns([newer, older], "VRT");
    expect(record?.currentPrice).toBe(145);
    expect(record?.refreshedAt).toBe("2026-07-15T05:52:00.000Z");
  });
});
