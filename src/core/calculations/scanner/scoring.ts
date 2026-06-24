import type {
  RuleCheck,
  ScannerMomentum,
  ScannerStrategyResult,
  ScannerTrend,
  SoStatus,
} from "@/core/domain/types/scanner";
import { isInMidZone } from "./ema-strategy";
import {
  isAvgPriceFalling,
  isAvgPriceRising,
  isValidSellCallSetup,
  isValidSellPutSetup,
} from "./structure-momentum";

function fmt(value: number | null, digits = 2): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return value.toFixed(digits);
}

function fmtRange(range: { low: number; high: number } | null): string {
  if (!range) {
    return "—";
  }
  return `${range.low.toFixed(2)} - ${range.high.toFixed(2)}`;
}

function buildResult(checklist: RuleCheck[]): ScannerStrategyResult {
  const passReasons = checklist
    .filter((item) => item.passed)
    .map((item) => `${item.label}: ${item.detail}`);
  const failReasons = checklist
    .filter((item) => !item.passed)
    .map((item) => `${item.label}: ${item.detail}`);

  return {
    eligible: checklist.every((item) => item.passed),
    checklist,
    passReasons,
    failReasons,
  };
}

export function scoreBullPut(input: {
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  avgPrice: number | null;
  avgPricePrev: number | null;
}): ScannerStrategyResult {
  const avgPriceRising = isAvgPriceRising(input.avgPrice, input.avgPricePrev);

  const checklist: RuleCheck[] = [
    {
      label: "Bullish Structure",
      passed: input.marketStructure === "Bullish",
      detail: input.marketStructure,
    },
    {
      label: "Momentum Above EMA",
      passed: input.momentum === "Above EMA",
      detail: input.momentum,
    },
    {
      label: "Average Price > Previous Average Price",
      passed: avgPriceRising,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,
    },
    {
      label: "SO Rolling Up",
      passed: input.soStatus === "Rolling Up",
      detail: input.soStatus,
    },
  ];

  return buildResult(checklist);
}

export function scoreBearCall(input: {
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  avgPrice: number | null;
  avgPricePrev: number | null;
}): ScannerStrategyResult {
  const avgPriceFalling = isAvgPriceFalling(input.avgPrice, input.avgPricePrev);

  const checklist: RuleCheck[] = [
    {
      label: "Bearish Structure",
      passed: input.marketStructure === "Bearish",
      detail: input.marketStructure,
    },
    {
      label: "Momentum Below EMA",
      passed: input.momentum === "Below EMA",
      detail: input.momentum,
    },
    {
      label: "Average Price < Previous Average Price",
      passed: avgPriceFalling,
      detail: `${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)}`,
    },
    {
      label: "SO Rolling Down",
      passed: input.soStatus === "Rolling Down",
      detail: input.soStatus,
    },
  ];

  return buildResult(checklist);
}

export function scoreIronCondor(input: {
  so: number | null;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
  midPrice: number | null;
  atr14: number | null;
  icMidZone: { low: number; high: number } | null;
  rangeWidth: number | null;
}): ScannerStrategyResult {
  const soInRange = input.so != null && input.so >= 40 && input.so <= 60;
  const insideMid = isInMidZone(input.avgPrice, input.midPrice, input.atr14);
  const sellPutValid = isValidSellPutSetup({
    marketStructure: input.marketStructure,
    momentum: input.momentum,
    soStatus: input.soStatus,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
  });
  const sellCallValid = isValidSellCallSetup({
    marketStructure: input.marketStructure,
    momentum: input.momentum,
    soStatus: input.soStatus,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
  });

  const checklist: RuleCheck[] = [
    {
      label: "SO 40-60",
      passed: soInRange,
      detail: input.so != null ? `SO = ${input.so.toFixed(1)}` : "SO unavailable",
    },
    {
      label: "Average Price inside Adjusted Mid Zone",
      passed: insideMid,
      detail: fmtRange(input.icMidZone),
    },
    {
      label: "Sell Put conditions not fully satisfied",
      passed: !sellPutValid,
      detail: sellPutValid ? "Sell Put setup valid" : "Not a valid Sell Put setup",
    },
    {
      label: "Sell Call conditions not fully satisfied",
      passed: !sellCallValid,
      detail: sellCallValid ? "Sell Call setup valid" : "Not a valid Sell Call setup",
    },
  ];

  const result = buildResult(checklist);

  if (input.rangeWidth != null && input.rangeWidth <= 0) {
    result.eligible = false;
    result.failReasons.push(
      `Range width not positive: ${input.rangeWidth.toFixed(2)}`
    );
  }

  return result;
}

export function buildKeyReason(checklist: RuleCheck[]): string {
  const passed = checklist.filter((item) => item.passed).map((item) => item.label);
  if (passed.length === 0) {
    return "No rules passed";
  }
  return passed.join(" + ");
}
