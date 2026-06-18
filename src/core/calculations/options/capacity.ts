import type { OptionsCapacityStatus, OptionsTrade } from "@/core/domain/types/options";
import { scaleMaxRiskForRemaining } from "./contract-tracking";
import { daysToExpiration } from "./helpers";
import {
  normalizeOptionsTradeDate,
  todayOptionsTradeDate,
} from "./trade-dates";

/** Open risk within this DTE window reduces remaining capacity. */
export const CAPACITY_NEAR_TERM_DTE_MAX = 45;

export function sumOpenRiskUsd(trades: OptionsTrade[]): number {
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "open") continue;
    total += scaleMaxRiskForRemaining(trade);
  }
  return total;
}

/** True when trade max risk should reduce near-term remaining capacity. */
export function countsTowardCapacityRisk(
  trade: Pick<OptionsTrade, "expirationDate">,
  asOfDate?: string
): boolean {
  const expiration = trade.expirationDate;
  if (!expiration || !normalizeOptionsTradeDate(expiration)) {
    return true;
  }
  const dte = daysToExpiration(expiration, asOfDate);
  if (!Number.isFinite(dte)) {
    return true;
  }
  return dte <= CAPACITY_NEAR_TERM_DTE_MAX;
}

/** Sum open max risk for trades with DTE ≤ 45 (missing DTE included for safety). */
export function sumOpenRiskUsdForCapacity(
  trades: OptionsTrade[],
  asOfDate?: string
): number {
  const today = asOfDate ?? todayOptionsTradeDate();
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "open") continue;
    if (!countsTowardCapacityRisk(trade, today)) continue;
    total += scaleMaxRiskForRemaining(trade);
  }
  return total;
}

export function calculateRemainingCapacityUsd(
  usAvailableCashUsd: number,
  capacityOpenRiskUsd: number
): number {
  return usAvailableCashUsd - capacityOpenRiskUsd;
}

export function deriveCapacityStatus(
  remainingCapacityUsd: number
): OptionsCapacityStatus {
  if (remainingCapacityUsd > 0) return "OK";
  return "NO_TRADE";
}

export function calculateRiskUtilizationPercent(
  totalOpenRiskUsd: number,
  usAvailableCashUsd: number
): number | null {
  if (usAvailableCashUsd <= 0) return null;
  return (totalOpenRiskUsd / usAvailableCashUsd) * 100;
}
