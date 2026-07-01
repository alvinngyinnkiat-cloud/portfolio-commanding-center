import { describe, expect, it } from "vitest";
import type { ScannerTickerResult } from "@/core/domain/types/scanner";
import { buildEmaSummaryEntries } from "./build-ema-summary-entries";

function emaResult(
  ticker: string,
  output: "SELL PUT" | "SELL CALL" | "NO TRADE",
  ema20 = 100,
  atr14 = 4
): ScannerTickerResult {
  return {
    ticker,
    category: "ETF",
    market: "US",
    currentPrice: 102,
    priceAsOf: "2026-06-12",
    indicators: {
      ema20,
      atr14,
    } as ScannerTickerResult["indicators"],
    structure: {} as ScannerTickerResult["structure"],
    strategies: {
      bullPut: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      bearCall: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      ironCondor: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
    },
    emaStrategy: { output, reasons: [], checklist: [] },
    mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },
    bestSetup: null,
    tradable: output !== "NO TRADE",
    tradeReasons: [],
    recentCandles: [],
    status: "ok",
    notes: [],
  };
}

describe("buildEmaSummaryEntries", () => {
  it("returns top 5 EMA sell put candidates alphabetically", () => {
    const entries = buildEmaSummaryEntries(
      [
        emaResult("MSFT", "SELL PUT"),
        emaResult("AAPL", "SELL PUT"),
        emaResult("ZZZZ", "NO TRADE"),
      ],
      "SELL PUT"
    );

    expect(entries.map((entry) => entry.ticker)).toEqual(["AAPL", "MSFT"]);
    expect(entries[0]?.ema20).toBe(100);
    expect(entries[0]?.trade).toBe("90 / 80");
  });

  it("returns top 5 EMA sell call candidates alphabetically", () => {
    const entries = buildEmaSummaryEntries(
      [emaResult("TSLA", "SELL CALL"), emaResult("AMD", "SELL CALL")],
      "SELL CALL"
    );

    expect(entries.map((entry) => entry.ticker)).toEqual(["AMD", "TSLA"]);
    expect(entries[0]?.trade).toBe("110 / 120");
  });
});
