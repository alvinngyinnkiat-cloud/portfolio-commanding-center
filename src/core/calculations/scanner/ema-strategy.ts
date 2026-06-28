import type {
  EmaStrategyCheck,
  EmaStrategyResult,
  ScannerTrend,
  SoStatus,
  StrategyOutput,
} from "@/core/domain/types/scanner";
import { derivePrimarySuggestedStrategy } from "./chart-candles";

export type { StrategyOutput, SoStatus };

export function deriveSoStatus(
  so: number | null,
  soPrev: number | null
): SoStatus {
  if (so == null || soPrev == null) {
    return "Strong";
  }
  if (soPrev < 25 && so > soPrev) {
    return "Rolling Up";
  }
  if (soPrev > 75 && so < soPrev) {
    return "Rolling Down";
  }
  return "Strong";
}

function isInSellPutZone(
  avgPrice: number | null,
  support: number | null,
  atr14: number | null
): boolean {
  if (avgPrice == null || support == null || atr14 == null) {
    return false;
  }
  return avgPrice >= support && avgPrice <= support + atr14;
}

function isInSellCallZone(
  avgPrice: number | null,
  resistance: number | null,
  atr14: number | null
): boolean {
  if (avgPrice == null || resistance == null || atr14 == null) {
    return false;
  }
  return avgPrice >= resistance - atr14 && avgPrice <= resistance;
}

function isInMidZone(
  avgPrice: number | null,
  midPrice: number | null,
  atr14: number | null
): boolean {
  if (avgPrice == null || midPrice == null || atr14 == null) {
    return false;
  }
  return Math.abs(avgPrice - midPrice) <= atr14;
}

function fmt(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

/** Fresh Reversal 0%–+2.5% OR Extreme Reversal below -7.5%. */
export function emaDiffRulePassesPut(emaDiffPct: number | null): boolean {
  if (emaDiffPct == null) {
    return false;
  }
  return (emaDiffPct >= 0 && emaDiffPct <= 2.5) || emaDiffPct < -7.5;
}

/** Fresh Reversal 0% to -2.5% OR Extreme Reversal above +7.5%. */
export function emaDiffRulePassesCall(emaDiffPct: number | null): boolean {
  if (emaDiffPct == null) {
    return false;
  }
  return (emaDiffPct <= 0 && emaDiffPct >= -2.5) || emaDiffPct > 7.5;
}

function formatEmaDiffDetail(
  emaDiffPct: number | null,
  side: "put" | "call"
): string {
  if (emaDiffPct == null) {
    return "—";
  }
  const signed = `${emaDiffPct >= 0 ? "+" : ""}${emaDiffPct.toFixed(2)}%`;
  if (side === "put") {
    if (emaDiffPct >= 0 && emaDiffPct <= 2.5) {
      return `${signed} (Fresh Reversal Zone)`;
    }
    if (emaDiffPct < -7.5) {
      return `${signed} (Extreme Reversal Zone)`;
    }
    return signed;
  }
  if (emaDiffPct <= 0 && emaDiffPct >= -2.5) {
    return `${signed} (Fresh Reversal Zone)`;
  }
  if (emaDiffPct > 7.5) {
    return `${signed} (Extreme Reversal Zone)`;
  }
  return signed;
}

const PRIMARY_STRATEGY_LABEL = "Primary Suggested Strategy";

function buildPrimarySuggestedStrategyRow(input: {
  avgPrice: number | null;
  ema20: number | null;
}): EmaStrategyCheck {
  const strategy = derivePrimarySuggestedStrategy(input.avgPrice, input.ema20);
  const comparison = `${fmt(input.avgPrice)} vs ${fmt(input.ema20)}`;

  return {
    label: PRIMARY_STRATEGY_LABEL,
    passed: strategy != null,
    detail: strategy ?? "—",
    informationOnly: true,
    primaryStrategy: strategy ?? undefined,
    comparisonDetail: comparison,
  };
}

function deriveSma200TrendBias(
  avgPrice: number | null,
  sma200: number | null
): string {
  if (avgPrice == null || sma200 == null) {
    return "—";
  }
  if (avgPrice > sma200) {
    return "Bullish (Above SMA200)";
  }
  if (avgPrice < sma200) {
    return "Bearish (Below SMA200)";
  }
  return "Neutral (At SMA200)";
}

function isSma200AlignedWithOutput(
  output: StrategyOutput,
  avgPrice: number | null,
  sma200: number | null
): boolean {
  if (avgPrice == null || sma200 == null) {
    return false;
  }
  if (output === "SELL PUT") {
    return avgPrice > sma200;
  }
  if (output === "SELL CALL") {
    return avgPrice < sma200;
  }
  return false;
}

export function deriveEmaConfidence(
  output: StrategyOutput,
  avgPrice: number | null,
  sma200: number | null
): { confidence: "High" | "Medium" | null; contextNote: string | null } {
  if (output !== "SELL PUT" && output !== "SELL CALL") {
    return { confidence: null, contextNote: null };
  }
  if (avgPrice == null || sma200 == null) {
    return { confidence: null, contextNote: null };
  }

  if (output === "SELL PUT") {
    if (avgPrice > sma200) {
      return {
        confidence: "High",
        contextNote: "Bullish reversal with long-term trend support",
      };
    }
    if (avgPrice < sma200) {
      return {
        confidence: "Medium",
        contextNote:
          "Bullish reversal but below SMA200, possible recovery/counter-trend setup",
      };
    }
    return {
      confidence: "Medium",
      contextNote: "Bullish reversal at SMA200",
    };
  }

  if (avgPrice < sma200) {
    return {
      confidence: "High",
      contextNote: "Bearish reversal with long-term trend support",
    };
  }
  if (avgPrice > sma200) {
    return {
      confidence: "Medium",
      contextNote:
        "Bearish reversal but above SMA200, possible pullback/counter-trend setup",
    };
  }
  return {
    confidence: "Medium",
    contextNote: "Bearish reversal at SMA200",
  };
}

function buildMarketContext(input: {
  avgPrice: number | null;
  sma200: number | null;
  marketStructure: ScannerTrend;
  output: StrategyOutput;
}): EmaStrategyCheck[] {
  const smaAligned = isSma200AlignedWithOutput(
    input.output,
    input.avgPrice,
    input.sma200
  );

  return [
    {
      label: "Average Price vs SMA200 (Information Only)",
      passed: smaAligned,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.sma200)}`,
      informationOnly: true,
    },
    {
      label: "Structure",
      passed:
        (input.output === "SELL PUT" && input.marketStructure === "Bullish") ||
        (input.output === "SELL CALL" && input.marketStructure === "Bearish") ||
        input.output === "NO TRADE",
      detail: input.marketStructure,
      informationOnly: true,
    },
    {
      label: "Trend Bias (SMA200)",
      passed:
        input.avgPrice != null &&
        input.sma200 != null &&
        input.avgPrice > input.sma200,
      detail: deriveSma200TrendBias(input.avgPrice, input.sma200),
      informationOnly: true,
    },
  ];
}

function buildPutChecklist(input: {
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  ema20: number | null;
  emaDiffPct: number | null;
}): EmaStrategyCheck[] {
  return [
    buildPrimarySuggestedStrategyRow(input),
    {
      label: "Average Price vs EMA20",
      passed:
        input.avgPrice != null &&
        input.ema20 != null &&
        input.avgPrice > input.ema20,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.ema20)}`,
    },
    {
      label: "Current vs Previous Average Price",
      passed:
        input.avgPrice != null &&
        input.avgPricePrev != null &&
        input.avgPrice > input.avgPricePrev,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,
    },
    {
      label: "SO Status",
      passed: input.soStatus === "Rolling Up",
      detail: input.soStatus,
    },
    {
      label: "EMA Difference",
      passed: emaDiffRulePassesPut(input.emaDiffPct),
      detail: formatEmaDiffDetail(input.emaDiffPct, "put"),
    },
  ];
}

function buildCallChecklist(input: {
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  ema20: number | null;
  emaDiffPct: number | null;
}): EmaStrategyCheck[] {
  return [
    buildPrimarySuggestedStrategyRow(input),
    {
      label: "Average Price vs EMA20",
      passed:
        input.avgPrice != null &&
        input.ema20 != null &&
        input.avgPrice < input.ema20,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.ema20)}`,
    },
    {
      label: "Current vs Previous Average Price",
      passed:
        input.avgPrice != null &&
        input.avgPricePrev != null &&
        input.avgPrice < input.avgPricePrev,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,
    },
    {
      label: "SO Status",
      passed: input.soStatus === "Rolling Down",
      detail: input.soStatus,
    },
    {
      label: "EMA Difference",
      passed: emaDiffRulePassesCall(input.emaDiffPct),
      detail: formatEmaDiffDetail(input.emaDiffPct, "call"),
    },
  ];
}

function isEligible(checklist: EmaStrategyCheck[]): boolean {
  return checklist
    .filter((item) => !item.informationOnly)
    .every((item) => item.passed);
}

function buildFailReasons(checklist: EmaStrategyCheck[]): string[] {
  return checklist
    .filter((item) => !item.informationOnly && !item.passed)
    .map((item) => `${item.label}: ${item.detail}`);
}

function finalizeResult(
  output: StrategyOutput,
  checklist: EmaStrategyCheck[],
  contextInput: {
    avgPrice: number | null;
    sma200: number | null;
    marketStructure: ScannerTrend;
  }
): EmaStrategyResult {
  const { confidence, contextNote } = deriveEmaConfidence(
    output,
    contextInput.avgPrice,
    contextInput.sma200
  );

  return {
    output,
    reasons:
      output === "NO TRADE"
        ? []
        : checklist
            .filter((item) => !item.informationOnly && item.passed)
            .map((item) => item.label),
    checklist,
    marketContext: buildMarketContext({
      ...contextInput,
      output,
    }),
    confidence,
    contextNote,
  };
}

export function evaluateEmaStrategy(input: {
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  ema20: number | null;
  sma200: number | null;
  emaDiffPct: number | null;
  marketStructure: ScannerTrend;
  primarySupport: number | null;
  primaryResistance: number | null;
  atr14: number | null;
}): EmaStrategyResult {
  const checklistInput = {
    soStatus: input.soStatus,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
    ema20: input.ema20,
    emaDiffPct: input.emaDiffPct,
  };
  const contextInput = {
    avgPrice: input.avgPrice,
    sma200: input.sma200,
    marketStructure: input.marketStructure,
  };

  const putChecklist = buildPutChecklist(checklistInput);
  const callChecklist = buildCallChecklist(checklistInput);

  if (isEligible(putChecklist)) {
    return finalizeResult("SELL PUT", putChecklist, contextInput);
  }

  if (isEligible(callChecklist)) {
    return finalizeResult("SELL CALL", callChecklist, contextInput);
  }

  const displayChecklist =
    input.avgPrice != null && input.ema20 != null && input.avgPrice >= input.ema20
      ? putChecklist
      : callChecklist;

  const failReasons = buildFailReasons(displayChecklist);

  return {
    ...finalizeResult("NO TRADE", displayChecklist, contextInput),
    reasons:
      failReasons.length > 0
        ? failReasons.slice(0, 5)
        : ["Early reversal conditions not met"],
  };
}

export { isInMidZone, isInSellPutZone, isInSellCallZone };
