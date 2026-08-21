import type {
  ScannerMomentum,
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

function fmtSo(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "SO Value = —";
  }
  return `SO Value = ${value.toFixed(1)}`;
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}

export function buildSellPutChecklistReasons(input: {
  so: number | null;
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  ema20: number | null;
  ema20Prev: number | null;
  avgPrice: number | null;
  avgPricePrev: number | null;
}): string[] {
  const avgPriceRising = isAvgPriceRising(input.avgPrice, input.avgPricePrev);

  return [
    `EMA20 Momentum Rising = ${yesNo(input.momentum === "Rising")} (${fmt(input.ema20)} vs ${fmt(input.ema20Prev)})`,
    `Current Average Price > Previous Average Price = ${yesNo(avgPriceRising)} (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`,
    `SO Rolling Up = ${yesNo(input.soStatus === "Rolling Up")}`,
    fmtSo(input.so),
  ];
}

export function buildSellCallChecklistReasons(input: {
  so: number | null;
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  ema20: number | null;
  ema20Prev: number | null;
  avgPrice: number | null;
  avgPricePrev: number | null;
}): string[] {
  const avgPriceFalling = isAvgPriceFalling(input.avgPrice, input.avgPricePrev);

  return [
    `EMA20 Momentum Dropping = ${yesNo(input.momentum === "Dropping")} (${fmt(input.ema20)} vs ${fmt(input.ema20Prev)})`,
    `Current Average Price < Previous Average Price = ${yesNo(avgPriceFalling)} (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`,
    `SO Rolling Down = ${yesNo(input.soStatus === "Rolling Down")}`,
    fmtSo(input.so),
  ];
}

export function buildIronCondorChecklistReasons(input: {
  so: number | null;
  avgPrice: number | null;
  midPrice: number | null;
  atr14: number | null;
  icMidZone: { low: number; high: number } | null;
  sellPutSetupValid: boolean;
  sellCallSetupValid: boolean;
}): string[] {
  const soInRange = input.so != null && input.so >= 40 && input.so <= 60;
  const insideMid = isInMidZone(input.avgPrice, input.midPrice, input.atr14);

  return [
    `SO 40–60 = ${yesNo(soInRange)}${input.so != null ? ` (${input.so.toFixed(1)})` : ""}`,
    `Average Price inside Adjusted Mid Zone = ${yesNo(insideMid)} (${fmtRange(input.icMidZone)})`,
    `Sell Put conditions not fully satisfied = ${yesNo(!input.sellPutSetupValid)}`,
    `Sell Call conditions not fully satisfied = ${yesNo(!input.sellCallSetupValid)}`,
  ];
}

export function buildNoTradeReasons(input: {
  so: number | null;
  soStatus: SoStatus;
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  ema20: number | null;
  avgPrice: number | null;
  avgPricePrev: number | null;
  midPrice: number | null;
  atr14: number | null;
  icMidZone: { low: number; high: number } | null;
}): string[] {
  const reasons: string[] = [];
  const sellPutValid = isValidSellPutSetup({
    marketStructure: input.marketStructure,
    ema20: input.ema20,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
    soStatus: input.soStatus,
  });
  const sellCallValid = isValidSellCallSetup({
    marketStructure: input.marketStructure,
    ema20: input.ema20,
    avgPrice: input.avgPrice,
    avgPricePrev: input.avgPricePrev,
    soStatus: input.soStatus,
  });
  const soInRange = input.so != null && input.so >= 40 && input.so <= 60;
  const insideMid = isInMidZone(input.avgPrice, input.midPrice, input.atr14);

  const sellPutDirectional =
    input.momentum === "Rising" &&
    isAvgPriceRising(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Up";
  const sellCallDirectional =
    input.momentum === "Dropping" &&
    isAvgPriceFalling(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Down";

  if (!sellPutDirectional) {
    if (input.momentum !== "Rising") {
      reasons.push(`EMA20 not Rising (${input.momentum})`);
    }
    if (!isAvgPriceRising(input.avgPrice, input.avgPricePrev)) {
      reasons.push(
        `Current Average Price > Previous Average Price = No (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`
      );
    }
    if (input.soStatus !== "Rolling Up") {
      reasons.push(`SO Rolling Up = No (${input.soStatus})`);
    }
  }

  if (!sellCallDirectional) {
    if (input.momentum !== "Dropping") {
      reasons.push(`EMA20 not Dropping (${input.momentum})`);
    }
    if (!isAvgPriceFalling(input.avgPrice, input.avgPricePrev)) {
      reasons.push(
        `Current Average Price < Previous Average Price = No (${fmt(input.avgPrice)} vs ${fmt(input.avgPricePrev)})`
      );
    }
    if (input.soStatus !== "Rolling Down") {
      reasons.push(`SO Rolling Down = No (${input.soStatus})`);
    }
  }

  if (!(soInRange && insideMid && !sellPutValid && !sellCallValid)) {
    if (!soInRange) {
      reasons.push(`SO 40–60 = No${input.so != null ? ` (${input.so.toFixed(1)})` : ""}`);
    }
    if (!insideMid) {
      reasons.push(
        `Average Price inside Adjusted Mid Zone = No (${fmtRange(input.icMidZone)})`
      );
    }
    if (sellPutValid) {
      reasons.push("Sell Put conditions not fully satisfied = No (Sell Put setup valid)");
    }
    if (sellCallValid) {
      reasons.push("Sell Call conditions not fully satisfied = No (Sell Call setup valid)");
    }
  }

  return reasons.slice(0, 8);
}

/** @deprecated Use buildSellPutChecklistReasons for Main System display */
export function buildSellPutReasons(input: {
  avgPrice: number | null;
  sellPutRange: { low: number; high: number } | null;
  primarySupport: number | null;
  atr14: number | null;
}): string[] {
  const insideZone =
    input.avgPrice != null &&
    input.primarySupport != null &&
    input.atr14 != null &&
    input.avgPrice >= input.primarySupport &&
    input.avgPrice <= input.primarySupport + input.atr14;

  return [
    `Avg Price = ${fmt(input.avgPrice)}`,
    `Support Zone = ${fmtRange(input.sellPutRange)}`,
    `Avg Price inside zone = ${insideZone ? "Yes" : "No"}`,
  ];
}

/** @deprecated Use buildSellCallChecklistReasons for Main System display */
export function buildSellCallReasons(input: {
  avgPrice: number | null;
  sellCallRange: { low: number; high: number } | null;
  primaryResistance: number | null;
  atr14: number | null;
}): string[] {
  const insideZone =
    input.avgPrice != null &&
    input.primaryResistance != null &&
    input.atr14 != null &&
    input.avgPrice >= input.primaryResistance - input.atr14 &&
    input.avgPrice <= input.primaryResistance;

  return [
    `Avg Price = ${fmt(input.avgPrice)}`,
    `Resistance Zone = ${fmtRange(input.sellCallRange)}`,
    `Avg Price inside zone = ${insideZone ? "Yes" : "No"}`,
  ];
}

/** @deprecated Use buildIronCondorChecklistReasons for Main System display */
export function buildIronCondorReasons(input: {
  so: number | null;
  trend: ScannerTrend;
  avgPrice: number | null;
  icMidZone: { low: number; high: number } | null;
  rangeWidth: number | null;
  atr14: number | null;
}): string[] {
  const rangeWidthAtr =
    input.rangeWidth != null &&
    input.atr14 != null &&
    input.atr14 > 0
      ? input.rangeWidth / input.atr14
      : null;

  return [
    input.so != null ? `SO = ${input.so.toFixed(1)}` : "SO = —",
    `Structure = ${input.trend}`,
    `Avg Price = ${fmt(input.avgPrice)}`,
    `Mid Zone = ${fmtRange(input.icMidZone)}`,
    `Range Width = ${fmt(input.rangeWidth)}`,
    `Range Width = ${fmt(rangeWidthAtr)} ATR`,
  ];
}
