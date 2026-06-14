import type {

  ScannerRankedEntry,

  ScannerStrategy,

  ScannerTickerResult,

  StrategyOutput,

} from "@/core/domain/types/scanner";

import { buildKeyReason } from "./scoring";

import { strategyKeyToOutput } from "./main-system-display";



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

  const output = strategyKeyToOutput(strategy);



  return results

    .filter((row) => row.strategies[strategy].eligible)

    .sort((a, b) => a.ticker.localeCompare(b.ticker))

    .slice(0, 5)

    .map((row, index) => ({

      rank: index + 1,

      ticker: row.ticker,

      category: row.category,

      strategy: output,

      keyReason: buildKeyReason(row.strategies[strategy].checklist),

    }));

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


