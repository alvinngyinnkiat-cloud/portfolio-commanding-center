import { describe, expect, it } from "vitest";
import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { buildRankings } from "./ranking";

function resultWithEligibility(
  ticker: string,
  strategy: "bullPut" | "bearCall" | "ironCondor",
  checklist: Array<{ label: string; passed: boolean; detail: string }>,
  eligible = true
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
    currentPrice: 100,
    priceAsOf: "2026-06-12",
    indicators: {} as ScannerTickerResult["indicators"],
    structure: {} as ScannerTickerResult["structure"],
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
  };
}

describe("buildRankings", () => {
  it("ranks eligible tickers alphabetically and builds key reasons", () => {
    const results = [
      resultWithEligibility("MSFT", "bullPut", [
        { label: "SO Rolling Up", passed: true, detail: "Rolling Up" },
        { label: "Trend Bullish", passed: true, detail: "Bullish" },
        {
          label: "Average Price in Sell Put Zone",
          passed: true,
          detail: "290 - 300",
        },
        {
          label: "Average Price > Previous Average Price",
          passed: true,
          detail: "298 vs 295",
        },
      ]),
      resultWithEligibility("AAPL", "bullPut", [
        { label: "SO Rolling Up", passed: true, detail: "Rolling Up" },
        { label: "Trend Bullish", passed: true, detail: "Bullish" },
        {
          label: "Average Price in Sell Put Zone",
          passed: true,
          detail: "290 - 300",
        },
        {
          label: "Average Price > Previous Average Price",
          passed: false,
          detail: "295 vs 298",
        },
      ]),
      resultWithEligibility(
        "ZZZZ",
        "bullPut",
        [
          { label: "SO Rolling Up", passed: false, detail: "Strong" },
          { label: "Trend Bullish", passed: true, detail: "Bullish" },
          {
            label: "Average Price in Sell Put Zone",
            passed: true,
            detail: "290 - 300",
          },
          {
            label: "Average Price > Previous Average Price",
            passed: true,
            detail: "298 vs 295",
          },
        ],
        false
      ),
    ];

    const rankings = buildRankings(results);

    expect(rankings.bullPut.map((entry) => entry.ticker)).toEqual([
      "AAPL",
      "MSFT",
    ]);
    expect(rankings.bullPut[0].strategy).toBe("SELL PUT");
    expect(rankings.bullPut[0].keyReason).toContain("SO Rolling Up");
    expect(rankings.bullPut[0].keyReason).not.toContain(
      "Average Price > Previous Average Price"
    );
  });
});
