import type { OptionsStrategy, OptionsTrade } from "@/core/domain/types/options";
import { daysToExpiration } from "@/core/calculations/options/helpers";

export function isFoundationStrategy(strategy: OptionsStrategy): boolean {
  return strategy === "bullPut" || strategy === "buyCall" || strategy === "sellPut";
}

/** SELL CALL Vertical Spread income cycles only. */
export function isSellCallIncomeStrategy(strategy: OptionsStrategy): boolean {
  return strategy === "bearCall";
}

export function getFoundationTypeLabel(strategy: OptionsStrategy): string {
  switch (strategy) {
    case "bullPut":
      return "SELL PUT Vertical Spread";
    case "buyCall":
      return "BUY CALL";
    case "sellPut":
      return "SELL PUT";
    default:
      return "Unknown";
  }
}

export function getFoundationOpeningDte(trade: OptionsTrade): number {
  return daysToExpiration(trade.expirationDate, trade.openDate);
}

export function qualifiesAsFoundation(
  trade: OptionsTrade,
  minOpeningDte: number
): boolean {
  return (
    trade.status === "open" &&
    isFoundationStrategy(trade.strategy) &&
    getFoundationOpeningDte(trade) >= minOpeningDte
  );
}
