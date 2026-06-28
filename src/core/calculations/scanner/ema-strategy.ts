import type {
  EmaStrategyCheck,
  EmaStrategyResult,
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

function buildPutChecklist(input: {
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  ema20: number | null;
  sma200: number | null;
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
      label: "Average Price vs SMA200",
      passed:
        input.avgPrice != null &&
        input.sma200 != null &&
        input.avgPrice > input.sma200,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.sma200)}`,
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
  sma200: number | null;
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
      label: "Average Price vs SMA200",
      passed:
        input.avgPrice != null &&
        input.sma200 != null &&
        input.avgPrice < input.sma200,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.sma200)}`,
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

export function evaluateEmaStrategy(input: {
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  ema20: number | null;
  sma200: number | null;
  emaDiffPct: number | null;
  primarySupport: number | null;
  primaryResistance: number | null;
  atr14: number | null;
}): EmaStrategyResult {
  const putChecklist = buildPutChecklist(input);
  const callChecklist = buildCallChecklist(input);

  if (isEligible(putChecklist)) {
    return {
      output: "SELL PUT",
      reasons: putChecklist
        .filter((item) => !item.informationOnly && item.passed)
        .map((item) => item.label),
      checklist: putChecklist,
    };
  }

  if (isEligible(callChecklist)) {
    return {
      output: "SELL CALL",
      reasons: callChecklist
        .filter((item) => !item.informationOnly && item.passed)
        .map((item) => item.label),
      checklist: callChecklist,
    };
  }

  const displayChecklist =
    input.avgPrice != null && input.ema20 != null && input.avgPrice >= input.ema20
      ? putChecklist
      : callChecklist;

  const failReasons = buildFailReasons(displayChecklist);

  return {
    output: "NO TRADE",
    reasons: failReasons.length > 0 ? failReasons.slice(0, 5) : ["Early reversal conditions not met"],
    checklist: displayChecklist,
  };
}

export { isInMidZone, isInSellPutZone, isInSellCallZone };
