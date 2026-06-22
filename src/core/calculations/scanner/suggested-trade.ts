import type { ScannerStrategy, ScannerTickerResult } from "@/core/domain/types/scanner";

export interface SuggestedTradeInput {
  strategy: ScannerStrategy;
  currentPrice: number | null;
  weightedSupport: number | null;
  weightedResistance: number | null;
}

export interface SuggestedTradeResult {
  tradeDisplay: string;
  width: number | null;
  targetPremium: number | null;
  maxRiskUsd: number | null;
}

/** Spread width from current stock price — informational only. */
export function determineSpreadWidth(price: number): number {
  if (price < 100) return 5;
  if (price <= 250) return 10;
  if (price <= 500) return 15;
  return 25;
}

export function calculateTargetPremium(width: number): number {
  return width * 0.25;
}

export function calculateSuggestedMaxRisk(width: number): number {
  return width * 100;
}

export function calculateSellPutStrikes(
  weightedSupport: number,
  width: number
): { sellPut: number; buyPut: number } {
  const sellPut = Math.round(weightedSupport * 0.75);
  const buyPut = sellPut - width;
  return { sellPut, buyPut };
}

export function calculateSellCallStrikes(
  weightedResistance: number,
  width: number
): { sellCall: number; buyCall: number } {
  const sellCall = Math.round(weightedResistance * 1.25);
  const buyCall = sellCall + width;
  return { sellCall, buyCall };
}

export function formatSellPutTradeDisplay(sellPut: number, buyPut: number): string {
  return `${sellPut} / ${buyPut}`;
}

export function formatSellCallTradeDisplay(
  sellCall: number,
  buyCall: number
): string {
  return `${sellCall} / ${buyCall}`;
}

export function formatIronCondorTradeDisplay(
  buyPut: number,
  sellPut: number,
  sellCall: number,
  buyCall: number
): string {
  return `${buyPut}/${sellPut} + ${sellCall}/${buyCall}`;
}

function computeWeightedSupport(
  dailySupport: number | null,
  weeklySupport: number | null
): number | null {
  if (dailySupport != null && weeklySupport != null) {
    return dailySupport * 0.25 + weeklySupport * 0.75;
  }
  return null;
}

function computeWeightedResistance(
  dailyResistance: number | null,
  weeklyResistance: number | null
): number | null {
  if (dailyResistance != null && weeklyResistance != null) {
    return dailyResistance * 0.25 + weeklyResistance * 0.75;
  }
  return null;
}

export function resolveSuggestedTradePrice(row: ScannerTickerResult): number | null {
  if (row.currentPrice != null && Number.isFinite(row.currentPrice)) {
    return row.currentPrice;
  }
  if (row.indicators.avgPrice != null && Number.isFinite(row.indicators.avgPrice)) {
    return row.indicators.avgPrice;
  }
  if (row.structure.midPrice != null && Number.isFinite(row.structure.midPrice)) {
    return row.structure.midPrice;
  }
  return null;
}

export function resolveWeightedSupport(row: ScannerTickerResult): number | null {
  const { structure } = row;
  if (structure.primarySupport != null) {
    return structure.primarySupport;
  }
  return computeWeightedSupport(structure.dailySupport, structure.weeklySupport);
}

export function resolveWeightedResistance(row: ScannerTickerResult): number | null {
  const { structure } = row;
  if (structure.primaryResistance != null) {
    return structure.primaryResistance;
  }
  return computeWeightedResistance(
    structure.dailyResistance,
    structure.weeklyResistance
  );
}

export function buildSuggestedTradeFromResult(
  row: ScannerTickerResult,
  strategy: ScannerStrategy
): SuggestedTradeResult {
  return buildSuggestedTrade({
    strategy,
    currentPrice: resolveSuggestedTradePrice(row),
    weightedSupport: resolveWeightedSupport(row),
    weightedResistance: resolveWeightedResistance(row),
  });
}

export function buildSuggestedTrade(input: SuggestedTradeInput): SuggestedTradeResult {
  const width =
    input.currentPrice != null ? determineSpreadWidth(input.currentPrice) : null;
  const targetPremium = width != null ? calculateTargetPremium(width) : null;
  const maxRiskUsd = width != null ? calculateSuggestedMaxRisk(width) : null;

  if (width == null) {
    return {
      tradeDisplay: "—",
      width: null,
      targetPremium: null,
      maxRiskUsd: null,
    };
  }

  if (input.strategy === "bullPut") {
    if (input.weightedSupport == null) {
      return { tradeDisplay: "—", width, targetPremium, maxRiskUsd };
    }
    const { sellPut, buyPut } = calculateSellPutStrikes(
      input.weightedSupport,
      width
    );
    return {
      tradeDisplay: formatSellPutTradeDisplay(sellPut, buyPut),
      width,
      targetPremium,
      maxRiskUsd,
    };
  }

  if (input.strategy === "bearCall") {
    if (input.weightedResistance == null) {
      return { tradeDisplay: "—", width, targetPremium, maxRiskUsd };
    }
    const { sellCall, buyCall } = calculateSellCallStrikes(
      input.weightedResistance,
      width
    );
    return {
      tradeDisplay: formatSellCallTradeDisplay(sellCall, buyCall),
      width,
      targetPremium,
      maxRiskUsd,
    };
  }

  if (input.weightedSupport == null || input.weightedResistance == null) {
    return { tradeDisplay: "—", width, targetPremium, maxRiskUsd };
  }

  const putSide = calculateSellPutStrikes(input.weightedSupport, width);
  const callSide = calculateSellCallStrikes(input.weightedResistance, width);

  return {
    tradeDisplay: formatIronCondorTradeDisplay(
      putSide.buyPut,
      putSide.sellPut,
      callSide.sellCall,
      callSide.buyCall
    ),
    width,
    targetPremium,
    maxRiskUsd,
  };
}
