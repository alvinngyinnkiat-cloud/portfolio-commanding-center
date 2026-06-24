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

/** Price momentum relative to EMA20. */
export function deriveMomentum(
  avgPrice: number | null,
  ema20: number | null
): ScannerMomentum {
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

export interface SellPutSetupInput {
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
}

export interface SellCallSetupInput {
  marketStructure: ScannerTrend;
  momentum: ScannerMomentum;
  soStatus: SoStatus;
  avgPrice: number | null;
  avgPricePrev: number | null;
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

export function isValidSellPutSetup(input: SellPutSetupInput): boolean {
  return (
    input.marketStructure === "Bullish" &&
    input.momentum === "Above EMA" &&
    isAvgPriceRising(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Up"
  );
}

export function isValidSellCallSetup(input: SellCallSetupInput): boolean {
  return (
    input.marketStructure === "Bearish" &&
    input.momentum === "Below EMA" &&
    isAvgPriceFalling(input.avgPrice, input.avgPricePrev) &&
    input.soStatus === "Rolling Down"
  );
}
