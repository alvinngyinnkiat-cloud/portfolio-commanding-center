import type { OptionsCapacityStatus, OptionsTrade } from "@/core/domain/types/options";

export function sumOpenRiskUsd(trades: OptionsTrade[]): number {
  let total = 0;
  for (const trade of trades) {
    if (trade.status !== "open") continue;
    total += trade.maxRiskUsd;
  }
  return total;
}

export function calculateRemainingCapacityUsd(
  usAvailableCashUsd: number,
  totalOpenRiskUsd: number
): number {
  return usAvailableCashUsd - totalOpenRiskUsd;
}

export function deriveCapacityStatus(
  remainingCapacityUsd: number
): OptionsCapacityStatus {
  if (remainingCapacityUsd > 0) return "OK";
  if (remainingCapacityUsd === 0) return "AT_LIMIT";
  return "NO_TRADE";
}

export function calculateRiskUtilizationPercent(
  totalOpenRiskUsd: number,
  usAvailableCashUsd: number
): number | null {
  if (usAvailableCashUsd <= 0) return null;
  return (totalOpenRiskUsd / usAvailableCashUsd) * 100;
}
