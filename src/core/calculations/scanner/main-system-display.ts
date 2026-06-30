import type {
  MainSystemDisplay,
  ScannerMomentum,
  ScannerStrategyResult,
  ScannerTrend,
  SoStatus,
} from "@/core/domain/types/scanner";
import type { ScannerStrategy } from "@/core/domain/types/scanner";
import { failedCheckLabels } from "./zone-checklist";

export function strategyOutputToKey(
  output: MainSystemDisplay["output"]
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

export function strategyKeyToOutput(strategy: ScannerStrategy): MainSystemDisplay["output"] {
  if (strategy === "bullPut") {
    return "SELL PUT";
  }
  if (strategy === "bearCall") {
    return "SELL CALL";
  }
  return "IRON CONDOR";
}

const STRATEGY_PRIORITY: ScannerStrategy[] = ["bullPut", "bearCall", "ironCondor"];

export interface MainSystemDecisionInput {
  bullPut: ScannerStrategyResult;
  bearCall: ScannerStrategyResult;
  ironCondor: ScannerStrategyResult;
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

function buildNoTradeReasons(input: MainSystemDecisionInput): string[] {
  let checklist = input.ironCondor.checklist;
  if (input.marketStructure === "Bullish") {
    checklist = input.bullPut.checklist;
  } else if (input.marketStructure === "Bearish") {
    checklist = input.bearCall.checklist;
  }
  return failedCheckLabels(checklist);
}

function passedCheckLabels(checklist: MainSystemDecisionInput["bullPut"]["checklist"]): string[] {
  return checklist.filter((item) => item.passed).map((item) => item.label);
}

export function evaluateMainSystemDisplay(
  input: MainSystemDecisionInput
): MainSystemDisplay {
  const candidates: Array<{
    strategy: ScannerStrategy;
    output: MainSystemDisplay["output"];
    reasons: string[];
  }> = [];

  if (input.bullPut.eligible) {
    candidates.push({
      strategy: "bullPut",
      output: "SELL PUT",
      reasons: passedCheckLabels(input.bullPut.checklist),
    });
  }

  if (input.bearCall.eligible) {
    candidates.push({
      strategy: "bearCall",
      output: "SELL CALL",
      reasons: passedCheckLabels(input.bearCall.checklist),
    });
  }

  if (input.ironCondor.eligible) {
    candidates.push({
      strategy: "ironCondor",
      output: "IRON CONDOR",
      reasons: passedCheckLabels(input.ironCondor.checklist),
    });
  }

  if (candidates.length === 0) {
    return {
      output: "NO TRADE",
      strategy: null,
      reasons: buildNoTradeReasons(input),
    };
  }

  const winner =
    STRATEGY_PRIORITY.map((strategy) =>
      candidates.find((candidate) => candidate.strategy === strategy)
    ).find((candidate) => candidate != null) ?? candidates[0];

  const strategyResults = {
    bullPut: input.bullPut,
    bearCall: input.bearCall,
    ironCondor: input.ironCondor,
  };

  return {
    output: winner.output,
    strategy: winner.strategy,
    reasons: passedCheckLabels(strategyResults[winner.strategy].checklist),
  };
}
