import { describe, expect, it } from "vitest";

import type { ScannerTickerResult } from "@/core/domain/types/scanner";

import { matchesFilters } from "@/modules/scanner/components/ScannerFilterBar";

import { SCANNER_CATEGORIES } from "@/core/calculations/scanner/watchlist";



function baseResult(

  overrides: Partial<ScannerTickerResult> = {}

): ScannerTickerResult {

  return {

    ticker: "AAPL",

    category: "MAG 7",

    market: "US",

    currentPrice: 100,

    priceAsOf: "2026-06-12",

    indicators: {} as ScannerTickerResult["indicators"],

    structure: {} as ScannerTickerResult["structure"],

    strategies: {

      bullPut: { eligible: true, checklist: [], passReasons: [], failReasons: [] },

      bearCall: { eligible: false, checklist: [], passReasons: [], failReasons: [] },

      ironCondor: { eligible: false, checklist: [], passReasons: [], failReasons: [] },

    },

    emaStrategy: { output: "SELL PUT", reasons: [], checklist: [] },

    mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },

    bestSetup: "bullPut",

    tradable: false,

    tradeReasons: [],

    recentCandles: [],

    status: "ok",

    notes: [],

    ...overrides,

  };

}



describe("matchesFilters", () => {

  it("filters by 20 EMA system output", () => {

    const tradable = baseResult({

      emaStrategy: { output: "SELL PUT", reasons: [], checklist: [] },

      mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },

    });

    const noEma = baseResult({

      emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },

      mainSystem: { output: "SELL CALL", strategy: "bearCall", reasons: [] },

    });



    expect(matchesFilters("all", "all", "ema20", false, tradable)).toBe(true);

    expect(matchesFilters("all", "all", "ema20", false, noEma)).toBe(false);

  });



  it("filters by main system output", () => {

    const mainTrade = baseResult({

      emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },

      mainSystem: { output: "IRON CONDOR", strategy: "ironCondor", reasons: [] },

    });

    const noMain = baseResult({

      emaStrategy: { output: "SELL PUT", reasons: [], checklist: [] },

      mainSystem: { output: "NO TRADE", strategy: null, reasons: [] },

    });



    expect(matchesFilters("all", "all", "main", false, mainTrade)).toBe(true);

    expect(matchesFilters("all", "all", "main", false, noMain)).toBe(false);

  });



  it("filters tradable-only cards", () => {

    const tradable = baseResult({ tradable: true });

    const notTradable = baseResult({ tradable: false });



    expect(matchesFilters("all", "all", "all", true, tradable)).toBe(true);

    expect(matchesFilters("all", "all", "all", true, notTradable)).toBe(false);

  });



  it("includes Custom in scanner categories", () => {

    expect(SCANNER_CATEGORIES).toContain("Custom");

  });

});


