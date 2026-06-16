import type { OptionsTrade } from "@/core/domain/types/options";
import { getRemainingContracts } from "./contract-tracking";
import {
  calculateOptionDollarValue,
  calculatePerShareOptionPrice,
} from "./open-trade-display";
import { isDebitStrategy } from "./strategy-kind";

/**
 * Broker-style open option market value (USD).
 *
 * Short (credit): Current Price × 100 × Contracts × −1
 * Long (debit):   Current Price × 100 × Contracts
 */
export function calculateOpenOptionMarketValueUsd(
  trade: OptionsTrade
): number | null {
  if (trade.status !== "open" || trade.currentValueUsd == null) {
    return null;
  }

  const contracts = getRemainingContracts(trade);
  if (contracts <= 0) {
    return null;
  }

  const pricePerShare = calculatePerShareOptionPrice(
    trade.currentValueUsd,
    contracts
  );
  if (pricePerShare == null) {
    return null;
  }

  const absoluteValueUsd = calculateOptionDollarValue(pricePerShare, contracts);
  return isDebitStrategy(trade.strategy) ? absoluteValueUsd : -absoluteValueUsd;
}

/** Sum of broker-style market values for all marked open options. */
export function calculateNetOptionsMarketValueUsd(
  trades: OptionsTrade[]
): number | null {
  let total = 0;
  let hasMarked = false;

  for (const trade of trades) {
    if (trade.status !== "open") continue;
    const marketValue = calculateOpenOptionMarketValueUsd(trade);
    if (marketValue == null) continue;
    hasMarked = true;
    total += marketValue;
  }

  return hasMarked ? total : null;
}
