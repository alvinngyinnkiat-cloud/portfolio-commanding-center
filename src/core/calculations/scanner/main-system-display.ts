import type {

  MainSystemDisplay,

  ScannerStrategy,

  ScannerTrend,

  SoStatus,

  StrategyOutput,

} from "@/core/domain/types/scanner";

import {

  buildIronCondorChecklistReasons,

  buildNoTradeReasons,

  buildSellCallChecklistReasons,

  buildSellPutChecklistReasons,

} from "./display-reasons";



export function strategyOutputToKey(

  output: StrategyOutput

): ScannerStrategy | null {

  if (output === "SELL PUT") {

    return "bullPut";

  }

  if (output === "SELL CALL") {

    return "bearCall";

  }

  if (output === "IRON CONDOR") {

    return "ironCondor";

  }

  return null;

}



export function strategyKeyToOutput(strategy: ScannerStrategy): StrategyOutput {

  if (strategy === "bullPut") {

    return "SELL PUT";

  }

  if (strategy === "bearCall") {

    return "SELL CALL";

  }

  return "IRON CONDOR";

}



const STRATEGY_PRIORITY: ScannerStrategy[] = [

  "bullPut",

  "bearCall",

  "ironCondor",

];



export interface MainSystemDecisionInput {

  bullPutEligible: boolean;

  bearCallEligible: boolean;

  ironCondorEligible: boolean;

  trend: ScannerTrend;

  so: number | null;

  soStatus: SoStatus;

  avgPrice: number | null;

  avgPricePrev: number | null;

  midPrice: number | null;

  atr14: number | null;

  primarySupport: number | null;

  primaryResistance: number | null;

  sellPutRange: { low: number; high: number } | null;

  sellCallRange: { low: number; high: number } | null;

  icMidZone: { low: number; high: number } | null;

}



export function evaluateMainSystemDisplay(

  input: MainSystemDecisionInput

): MainSystemDisplay {

  const candidates: Array<{

    strategy: ScannerStrategy;

    output: StrategyOutput;

    reasons: string[];

  }> = [];



  if (input.bullPutEligible) {

    candidates.push({

      strategy: "bullPut",

      output: "SELL PUT",

      reasons: buildSellPutChecklistReasons({

        so: input.so,

        soStatus: input.soStatus,

        trend: input.trend,

        avgPrice: input.avgPrice,

        avgPricePrev: input.avgPricePrev,

        primarySupport: input.primarySupport,

        atr14: input.atr14,

        sellPutRange: input.sellPutRange,

      }),

    });

  }



  if (input.bearCallEligible) {

    candidates.push({

      strategy: "bearCall",

      output: "SELL CALL",

      reasons: buildSellCallChecklistReasons({

        so: input.so,

        soStatus: input.soStatus,

        trend: input.trend,

        avgPrice: input.avgPrice,

        avgPricePrev: input.avgPricePrev,

        primaryResistance: input.primaryResistance,

        atr14: input.atr14,

        sellCallRange: input.sellCallRange,

      }),

    });

  }



  if (input.ironCondorEligible) {

    candidates.push({

      strategy: "ironCondor",

      output: "IRON CONDOR",

      reasons: buildIronCondorChecklistReasons({

        so: input.so,

        trend: input.trend,

        avgPrice: input.avgPrice,

        midPrice: input.midPrice,

        atr14: input.atr14,

        icMidZone: input.icMidZone,

      }),

    });

  }



  if (candidates.length === 0) {

    return {

      output: "NO TRADE",

      strategy: null,

      reasons: buildNoTradeReasons({

        so: input.so,

        trend: input.trend,

        avgPrice: input.avgPrice,

        midPrice: input.midPrice,

        atr14: input.atr14,

        bullPutEligible: input.bullPutEligible,

        bearCallEligible: input.bearCallEligible,

        ironCondorEligible: input.ironCondorEligible,

      }),

    };

  }



  const winner =

    STRATEGY_PRIORITY.map((strategy) =>

      candidates.find((candidate) => candidate.strategy === strategy)

    ).find((candidate) => candidate != null) ?? candidates[0];



  return {

    output: winner.output,

    strategy: winner.strategy,

    reasons: winner.reasons,

  };

}


