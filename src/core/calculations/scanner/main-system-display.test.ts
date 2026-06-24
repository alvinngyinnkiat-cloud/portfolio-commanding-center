import { describe, expect, it } from "vitest";
import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import {
  reconcileMainSystemFromResult,
} from "./normalize-scan-result";
import { strategyOutputToKey } from "./main-system-display";

function baseResult(
  overrides: Partial<ScannerTickerResult> = {}
): ScannerTickerResult {
  return {
    ticker: "AAPL",
    category: "MAG 7",
    market: "US",
    currentPrice: 100,
    priceAsOf: "2026-06-12",
    indicators: {
      ema20: 100,
      ema20Prev: 99,
      sma50: 98,
      sma50Prev: 97,
      sma50SlopePct: 1,
      sma200: 95,
      atr14: 10,
      so: 52.4,
      soPrev: 50,
      soStatus: "Strong",
      high: 102,
      low: 98,
      avgPrice: 322.86,
      avgPricePrev: 320,
      emaDiff: 1,
      emaDiffPct: 1,
      marketStructure: "Neutral",
      momentum: "At EMA",
      trend: "Neutral",
      trendQualityScore: 10,
    },
    structure: {
      dailySupport: 290,
      weeklySupport: 295,
      primarySupport: 293.89,
      dailyResistance: 360,
      weeklyResistance: 350,
      primaryResistance: 354.46,
      midPrice: 324.18,
      rangeWidth: 60.57,
      sellPutRange: { low: 293.89, high: 303.89 },
      sellCallRange: { low: 344.46, high: 354.46 },
      icMidZone: { low: 314.18, high: 334.18 },
    },
    strategies: {
      bullPut: {
        eligible: false,
        checklist: [],
        passReasons: [],
        failReasons: [],
      },
      bearCall: {
        eligible: false,
        checklist: [],
        passReasons: [],
        failReasons: [],
      },
      ironCondor: {
        eligible: true,
        checklist: [],
        passReasons: [],
        failReasons: [],
      },
    },
    emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },
    mainSystem: {
      output: "SELL PUT",
      strategy: "bullPut",
      reasons: ["Iron Condor", "SO = 52", "Near Mid Price"],
    },
    bestSetup: "ironCondor",
    tradable: true,
    tradeReasons: ["Iron Condor", "SO = 52", "Near Mid Price"],
    recentCandles: [],
    status: "ok",
    notes: [],
    ...overrides,
  };
}

describe("reconcileMainSystemFromResult", () => {
  it("recomputes mainSystem from strategies and never uses stale tradeReasons", () => {
    const reconciled = reconcileMainSystemFromResult(baseResult());

    expect(reconciled.output).toBe("IRON CONDOR");
    expect(reconciled.strategy).toBe("ironCondor");
    expect(reconciled.reasons.join(" ")).toMatch(/40–60|40-60/);
    expect(reconciled.reasons.join(" ")).not.toMatch(/Iron Condor|Near Mid Price|Support Defined/);
    expect(reconciled.reasons.join(" ")).not.toMatch(/Sell Put Zone/);
  });

  it("returns EMPTY_MAIN with strategy null for incomplete scans", () => {
    const reconciled = reconcileMainSystemFromResult(
      baseResult({
        status: "incomplete",
        indicators: { ...baseResult().indicators, atr14: null },
        mainSystem: undefined as unknown as ScannerTickerResult["mainSystem"],
      })
    );

    expect(reconciled.output).toBe("NO TRADE");
    expect(reconciled.strategy).toBeNull();
  });
});

describe("strategyOutputToKey", () => {
  it("maps strategy outputs to keys", () => {
    expect(strategyOutputToKey("SELL PUT")).toBe("bullPut");
    expect(strategyOutputToKey("SELL CALL")).toBe("bearCall");
    expect(strategyOutputToKey("IRON CONDOR")).toBe("ironCondor");
    expect(strategyOutputToKey("NO TRADE")).toBeNull();
  });
});
