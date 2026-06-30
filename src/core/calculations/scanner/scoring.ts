import type {
  RuleCheck,
  ScannerMomentum,
  ScannerStrategyResult,
  ScannerTrend,
  SoStatus,
} from "@/core/domain/types/scanner";
import {
  buildMidZoneCheck,
  buildSellCallZoneCheck,
  buildSellPutZoneCheck,
} from "./zone-checklist";
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
  primarySupport: number | null;
  atr14: number | null;
  sellPutRange: { low: number; high: number } | null;
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
    buildSellPutZoneCheck({
      avgPrice: input.avgPrice,
      primarySupport: input.primarySupport,
      atr14: input.atr14,
      sellPutRange: input.sellPutRange,
    }),
  ];

  return buildResult(checklist);
}

export function scoreBearCall(input: {
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  avgPrice: number | null;
  avgPricePrev: number | null;
  primaryResistance: number | null;
  atr14: number | null;
  sellCallRange: { low: number; high: number } | null;
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
    buildSellCallZoneCheck({
      avgPrice: input.avgPrice,
      primaryResistance: input.primaryResistance,
      atr14: input.atr14,
      sellCallRange: input.sellCallRange,
    }),
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
  const midZoneCheck = buildMidZoneCheck({
    avgPrice: input.avgPrice,
    midPrice: input.midPrice,
    atr14: input.atr14,
    icMidZone: input.icMidZone,
  });
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
    midZoneCheck,
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
