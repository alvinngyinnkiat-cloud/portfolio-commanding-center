import type { StrategyOutput } from "@/core/domain/types/scanner";
import {
  calculateTargetPremium,
  determineSpreadWidth,
} from "./suggested-trade";

export interface EmaSuggestedTradeResult {
  ema20: number | null;
  atr14: number | null;
  shortStrike: number | null;
  longStrike: number | null;
  width: number | null;
  estimatedPremium: number | null;
  tradeDisplay: string;
}

export function buildEmaSuggestedTrade(input: {
  output: StrategyOutput;
  ema20: number | null;
  atr14: number | null;
  currentPrice: number | null;
}): EmaSuggestedTradeResult {
  const empty: EmaSuggestedTradeResult = {
    ema20: input.ema20,
    atr14: input.atr14,
    shortStrike: null,
    longStrike: null,
    width: null,
    estimatedPremium: null,
    tradeDisplay: "—",
  };

  if (
    input.output === "NO TRADE" ||
    input.output === "IRON CONDOR" ||
    input.ema20 == null ||
    input.atr14 == null
  ) {
    return empty;
  }

  const price = input.currentPrice ?? input.ema20;
  const width = determineSpreadWidth(price);
  const estimatedPremium = calculateTargetPremium(width);

  if (input.output === "SELL PUT") {
    const shortStrike = Math.round(input.ema20 - 2.5 * input.atr14);
    const longStrike = shortStrike - width;
    return {
      ema20: input.ema20,
      atr14: input.atr14,
      shortStrike,
      longStrike,
      width,
      estimatedPremium,
      tradeDisplay: `${shortStrike} / ${longStrike}`,
    };
  }

  const shortStrike = Math.round(input.ema20 + 2.5 * input.atr14);
  const longStrike = shortStrike + width;
  return {
    ema20: input.ema20,
    atr14: input.atr14,
    shortStrike,
    longStrike,
    width,
    estimatedPremium,
    tradeDisplay: `${shortStrike} / ${longStrike}`,
  };
}
