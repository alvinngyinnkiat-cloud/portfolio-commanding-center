import { describe, expect, it } from "vitest";
import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { buildRankings } from "./ranking";

function resultWithEligibility(
  ticker: string,
  strategy: "bullPut" | "bearCall" | "ironCondor",
  checklist: Array<{ label: string; passed: boolean; detail: string }>,
  eligible = true,
  overrides: Partial<ScannerTickerResult> = {}
): ScannerTickerResult {
  const emptyStrategy = {
    eligible: false,
    checklist: [],
    passReasons: [],
    failReasons: [],
  };

  return {
    ticker,
    category: "ETF",
    market: "US",
    currentPrice: 220,
    priceAsOf: "2026-06-12",
    indicators: {} as ScannerTickerResult["indicators"],
    structure: {
      primarySupport: 200,
      primaryResistance: 250,
    } as ScannerTickerResult["structure"],
    strategies: {
      bullPut: emptyStrategy,
      bearCall: emptyStrategy,
      ironCondor: emptyStrategy,
      [strategy]: {
        eligible,
        checklist,
        passReasons: [],
        failReasons: [],
      },
    },
    emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },
    mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },
    bestSetup: strategy,
    tradable: false,
    tradeReasons: [],
    recentCandles: [],
    status: "ok",
    notes: [],
    ...overrides,
  };
}

describe("buildRankings", () => {
  it("ranks eligible tickers alphabetically with suggested trades", () => {
    const results = [
      resultWithEligibility("MSFT", "bullPut", []),
      resultWithEligibility("AAPL", "bullPut", []),
      resultWithEligibility("ZZZZ", "bullPut", [], false),
    ];

    const rankings = buildRankings(results);

    expect(rankings.bullPut.map((entry) => entry.ticker)).toEqual([
      "AAPL",
      "MSFT",
    ]);
    expect(rankings.bullPut[0]).toMatchObject({
      trade: "150 / 140",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
    });
  });

  it("builds iron condor suggested trade format", () => {
    const results = [
      resultWithEligibility("V", "ironCondor", [], true, {
        currentPrice: 280,
        structure: {
          primarySupport: 260,
          primaryResistance: 320,
        } as ScannerTickerResult["structure"],
      }),
    ];

    const rankings = buildRankings(results);

    expect(rankings.ironCondor[0]).toMatchObject({
      ticker: "V",
      width: 15,
      targetPremium: 3.75,
      maxRiskUsd: 1500,
      trade: "180/195 + 400/415",
    });
  });
});
