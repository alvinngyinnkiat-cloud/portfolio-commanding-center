import { describe, expect, it } from "vitest";
import type { ScannerScanRun, ScannerTickerResult } from "@/core/domain/types/scanner";
import { normalizeScannerScanRun } from "./normalize-scan-result";
import { buildRankings } from "./ranking";

function ironCondorResult(
  ticker: string,
  currentPrice: number,
  primarySupport: number,
  primaryResistance: number
): ScannerTickerResult {
  return {
    ticker,
    category: "MAG 7",
    market: "US",
    currentPrice,
    priceAsOf: "2026-06-14",
    indicators: {
      avgPrice: currentPrice,
    } as ScannerTickerResult["indicators"],
    structure: {
      primarySupport,
      primaryResistance,
      midPrice: (primarySupport + primaryResistance) / 2,
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
    const amzn = ironCondorResult("AMZN", 220, 200, 260);
    const rddt = ironCondorResult("RDDT", 145, 120, 180);
    const visa = ironCondorResult("V", 280, 260, 320);

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
      trade: "140/150 + 325/335",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
    });

    const rddtEntry = ironCondor.find((entry) => entry.ticker === "RDDT");
    expect(rddtEntry).toMatchObject({
      trade: "80/90 + 225/235",
      width: 10,
      targetPremium: 2.5,
      maxRiskUsd: 1000,
    });

    const visaEntry = ironCondor.find((entry) => entry.ticker === "V");
    expect(visaEntry).toMatchObject({
      trade: "180/195 + 400/415",
      width: 15,
      targetPremium: 3.75,
      maxRiskUsd: 1500,
    });
  });
});

describe("buildRankings iron condor candidates", () => {
  it("calculates suggested trades for all three strategy tables", () => {
    const amzn = ironCondorResult("AMZN", 220, 200, 260);
    amzn.strategies.bullPut.eligible = true;
    amzn.strategies.bearCall.eligible = true;

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
      trade: "325 / 335",
    });
    expect(rankings.ironCondor[0]).toMatchObject({
      ticker: "AMZN",
      trade: "140/150 + 325/335",
    });
  });
});
