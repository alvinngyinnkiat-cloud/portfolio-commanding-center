import type { ScannerMomentum, ScannerTrend, SoStatus } from "@/core/domain/types/scanner";

/** Market structure from EMA/SMA stack — price-independent. */
export function deriveMarketStructure(
  ema20: number | null,
  sma50: number | null,
  sma200: number | null
): ScannerTrend {
  if (ema20 == null || sma50 == null || sma200 == null) {
    return "Neutral";
  }
  if (ema20 > sma50 && sma50 > sma200) {
    return "Bullish";
  }
  if (ema20 < sma50 && sma50 < sma200) {
    return "Bearish";
  }
  return "Neutral";
}

/** Main System momentum — EMA20 direction vs previous session. */
export function deriveMainSystemMomentum(
  ema20: number | null,
  ema20Prev: number | null
): ScannerMomentum {
  if (ema20 == null || ema20Prev == null) {
    return "Flat";
  }
  if (ema20 > ema20Prev) {
    return "Rising";
  }
  if (ema20 < ema20Prev) {
    return "Dropping";
  }
  return "Flat";
}

/** @deprecated Iron Condor gating only — average price position vs EMA20. */
export type ScannerPriceEmaPosition = "Above EMA" | "Below EMA" | "At EMA";

/** Average price position relative to EMA20 — used by Iron Condor directional guards. */
export function derivePriceEmaPosition(
  avgPrice: number | null,
  ema20: number | null
): ScannerPriceEmaPosition {
  if (avgPrice == null || ema20 == null) {
    return "At EMA";
  }
  if (avgPrice > ema20) {
    return "Above EMA";
  }
  if (avgPrice < ema20) {
    return "Below EMA";
  }
  return "At EMA";
}

/** @deprecated Use derivePriceEmaPosition for Iron Condor; deriveMainSystemMomentum for Main System. */
export function deriveMomentum(
  avgPrice: number | null,
  ema20: number | null
): ScannerPriceEmaPosition {
  return derivePriceEmaPosition(avgPrice, ema20);
}

export interface SellPutSetupInput {
  marketStructure: ScannerTrend;
  ema20: number | null;
  avgPrice: number | null;
  avgPricePrev: number | null;
  soStatus: SoStatus;
}

export interface SellCallSetupInput {
  marketStructure: ScannerTrend;
  ema20: number | null;
  avgPrice: number | null;
  avgPricePrev: number | null;
  soStatus: SoStatus;
}

export function isAvgPriceRising(
  avgPrice: number | null,
  avgPricePrev: number | null
): boolean {
  return (
    avgPrice != null &&
    avgPricePrev != null &&
    avgPrice > avgPricePrev
  );
}

export function isAvgPriceFalling(
  avgPrice: number | null,
  avgPricePrev: number | null
): boolean {
  return (
    avgPrice != null &&
    avgPricePrev != null &&
    avgPrice < avgPricePrev
  );
}

/** Iron Condor guard — legacy directional setup including structure + price vs EMA20. */
export function isValidSellPutSetup(input: SellPutSetupInput): boolean {
  return (
    input.marketStructure === "Bullish" &&
    derivePriceEmaPosition(input.avgPrice, input.ema20) === "Above EMA" &&
    isAvgPriceRising(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Up"
  );
}

/** Iron Condor guard — legacy directional setup including structure + price vs EMA20. */
export function isValidSellCallSetup(input: SellCallSetupInput): boolean {
  return (
    input.marketStructure === "Bearish" &&
    derivePriceEmaPosition(input.avgPrice, input.ema20) === "Below EMA" &&
    isAvgPriceFalling(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Down"
  );
}
