import type {

  ScannerRankedEntry,

  ScannerStrategy,

  ScannerTickerResult,

} from "@/core/domain/types/scanner";

import { buildSuggestedTradeFromResult } from "./suggested-trade";
import { MAIN_SYSTEM_CONFIDENCE_RANK } from "./main-system-confidence";



export function buildRankings(results: ScannerTickerResult[]): {

  bullPut: ScannerRankedEntry[];

  bearCall: ScannerRankedEntry[];

  ironCondor: ScannerRankedEntry[];

} {

  return {

    bullPut: rankStrategy(results, "bullPut"),

    bearCall: rankStrategy(results, "bearCall"),

    ironCondor: rankStrategy(results, "ironCondor"),

  };

}



function rankStrategy(

  results: ScannerTickerResult[],

  strategy: ScannerStrategy

): ScannerRankedEntry[] {

  return results

    .filter((row) => row.strategies[strategy].eligible)

    .sort((a, b) => compareRankedRows(a, b, strategy))

    .slice(0, 5)

    .map((row, index) => {
      const suggested = buildSuggestedTradeFromResult(row, strategy);

      return {

        rank: index + 1,

        ticker: row.ticker,

        trade: suggested.tradeDisplay,

        width: suggested.width,

        targetPremium: suggested.targetPremium,

        maxRiskUsd: suggested.maxRiskUsd,

        confidence:
          strategy === "ironCondor" ? null : row.mainSystem.confidence ?? null,

      };

    });

}



function compareRankedRows(
  a: ScannerTickerResult,
  b: ScannerTickerResult,
  strategy: ScannerStrategy
): number {
  if (strategy !== "ironCondor") {
    const confA = a.mainSystem.confidence;
    const confB = b.mainSystem.confidence;
    if (confA && confB && confA !== confB) {
      return (
        MAIN_SYSTEM_CONFIDENCE_RANK[confA] - MAIN_SYSTEM_CONFIDENCE_RANK[confB]
      );
    }
  }
  return a.ticker.localeCompare(b.ticker);
}



export function countOpportunities(results: ScannerTickerResult[]): {

  bullPut: number;

  bearCall: number;

  ironCondor: number;

} {

  return {

    bullPut: results.filter((row) => row.strategies.bullPut.eligible).length,

    bearCall: results.filter((row) => row.strategies.bearCall.eligible).length,

    ironCondor: results.filter((row) => row.strategies.ironCondor.eligible)

      .length,

  };

}

