import type {
  MainSystemDisplay,
  ScannerMomentum,
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
import {
  isValidSellCallSetup,
  isValidSellPutSetup,
} from "./structure-momentum";

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
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  so: number | null;
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  midPrice: number | null;
  atr14: number | null;
  icMidZone: { low: number; high: number } | null;
}

export function evaluateMainSystemDisplay(
  input: MainSystemDecisionInput
): MainSystemDisplay {
  const sellPutSetupValid = isValidSellPutSetup({
    marketStructure: input.marketStructure,
    momentum: input.momentum,
    soStatus: input.soStatus,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
  });
  const sellCallSetupValid = isValidSellCallSetup({
    marketStructure: input.marketStructure,
    momentum: input.momentum,
    soStatus: input.soStatus,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
  });

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
        marketStructure: input.marketStructure,
        momentum: input.momentum,
        avgPrice: input.avgPrice,
        avgPricePrev: input.avgPricePrev,
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
        marketStructure: input.marketStructure,
        momentum: input.momentum,
        avgPrice: input.avgPrice,
        avgPricePrev: input.avgPricePrev,
      }),
    });
  }

  if (input.ironCondorEligible) {
    candidates.push({
      strategy: "ironCondor",
      output: "IRON CONDOR",
      reasons: buildIronCondorChecklistReasons({
        so: input.so,
        avgPrice: input.avgPrice,
        midPrice: input.midPrice,
        atr14: input.atr14,
        icMidZone: input.icMidZone,
        sellPutSetupValid,
        sellCallSetupValid,
      }),
    });
  }

  if (candidates.length === 0) {
    return {
      output: "NO TRADE",
      strategy: null,
      reasons: buildNoTradeReasons({
        so: input.so,
        soStatus: input.soStatus,
        marketStructure: input.marketStructure,
        momentum: input.momentum,
        avgPrice: input.avgPrice,
        avgPricePrev: input.avgPricePrev,
        midPrice: input.midPrice,
        atr14: input.atr14,
        icMidZone: input.icMidZone,
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
