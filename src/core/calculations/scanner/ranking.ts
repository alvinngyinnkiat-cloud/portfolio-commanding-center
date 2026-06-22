import type {

  ScannerRankedEntry,

  ScannerStrategy,

  ScannerTickerResult,

} from "@/core/domain/types/scanner";

import { buildSuggestedTradeFromResult } from "./suggested-trade";



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

    .sort((a, b) => a.ticker.localeCompare(b.ticker))

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

      };

    });

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


