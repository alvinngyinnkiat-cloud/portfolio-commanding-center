import { describe, expect, it } from "vitest";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";
import { normalizeScannerScanRun } from "./normalize-scan-result";
import { buildRankings } from "./ranking";

function ironCondorResult(
  ticker: string,
  currentPrice: number,
  icMidZone: { low: number; high: number },
  atr14 = 20
): ScannerTickerResult {
  return {
    ticker,
    category: "MAG 7",
    market: "US",
    currentPrice,
    priceAsOf: "2026-06-14",
    indicators: {
      avgPrice: currentPrice,
      atr14,
    } as ScannerTickerResult["indicators"],
    structure: {
      icMidZone,
      midPrice: (icMidZone.low + icMidZone.high) / 2,
    } as ScannerTickerResult["structure"],
    strategies: {
      bullPut: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      bearCall: { eligible: false, checklist: [], passReasons: [], failReasons: [] },
      ironCondor: { eligible: true, checklist: [], passReasons: [], failReasons: [] },
    },
    emaStrategy: { output: "NO TRADE", reasons: [], checklist: [] },
    mainSystem: { output: "IRON CONDOR", strategy: "ironCondor", reasons: [] },
    bestSetup: "ironCondor",
    tradable: true,
    tradeReasons: [],
    recentCandles: [],
    status: "ok",
    notes: [],
  };
}

describe("normalizeScannerScanRun", () => {
  it("rebuilds iron condor suggested trades from persisted results", () => {
    const amzn = ironCondorResult("AMZN", 220, { low: 200, high: 260 });
    const rddt = ironCondorResult("RDDT", 145, { low: 120, high: 180 });
    const visa = ironCondorResult("V", 280, { low: 317.16, high: 331.19 }, 7);

    const staleRun = {
      id: "run-1",
      scanDate: "2026-06-14",
      scanTime: "2026-06-14T06:00:00.000Z",
      marketDateUsed: "2026-06-13",
      refreshStatus: "success",
      tickersScanned: 3,
      tickersMissing: [],
      results: [amzn, rddt, visa],
      rankings: {
        bullPut: [],
        bearCall: [],
        ironCondor: [
          { rank: 1, ticker: "AMZN" },
          { rank: 2, ticker: "RDDT" },
          { rank: 3, ticker: "V" },
        ],
      },
      opportunities: { bullPut: 0, bearCall: 0, ironCondor: 3 },
      health: {
        dataSourceStatus: "healthy",
        lastSuccessfulRefresh: "2026-06-14T06:00:00.000Z",
        failedRefreshCount: 0,
        indicatorsCalculated: 3,
        missingTickers: [],
      },
    } as unknown as ScannerScanRun;

    const normalized = normalizeScannerScanRun(staleRun);
    const ironCondor = normalized?.rankings.ironCondor ?? [];

    expect(ironCondor).toHaveLength(3);
    expect(ironCondor.map((entry) => entry.ticker)).toEqual(["AMZN", "RDDT", "V"]);

    const amznEntry = ironCondor.find((entry) => entry.ticker === "AMZN");
    expect(amznEntry).toMatchObject({
      trade: "140/150 + 310/320",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
    });

    const rddtEntry = ironCondor.find((entry) => entry.ticker === "RDDT");
    expect(rddtEntry).toMatchObject({
      trade: "60/70 + 230/240",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
    });

    const visaEntry = ironCondor.find((entry) => entry.ticker === "V");
    expect(visaEntry).toMatchObject({
      trade: "285/300 + 349/364",
      width: 15,
      targetPremium: 3.75,
      maxRiskUsd: 1500,
    });
  });
});

describe("buildRankings iron condor candidates", () => {
  it("calculates suggested trades for all three strategy tables", () => {
    const amzn = ironCondorResult("AMZN", 220, { low: 200, high: 260 });
    amzn.strategies.bullPut.eligible = true;
    amzn.strategies.bearCall.eligible = true;
    amzn.structure.primarySupport = 200;
    amzn.structure.primaryResistance = 260;

    const rankings = buildRankings([amzn]);

    expect(rankings.bullPut[0]).toMatchObject({
      ticker: "AMZN",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
      trade: "150 / 140",
    });
    expect(rankings.bearCall[0]).toMatchObject({
      ticker: "AMZN",
      width: 10,
      trade: "310 / 320",
    });
    expect(rankings.ironCondor[0]).toMatchObject({
      ticker: "AMZN",
      trade: "140/150 + 310/320",
    });
  });
});
