import type { CryptoHolding, CryptoTrackerSummary } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { calculateCryptoContribution } from "./contribution";
import { buildCryptoHoldingRows } from "./holdings";

export function calculateCryptoHoldingsValue(holdings: CryptoHolding[]): number {
  return holdings.reduce((sum, h) => sum + coerceNumber(h.currentValueSgd), 0);
}

export function calculateAvailableTradingCash(
  totalCryptoCashContributed: number,
  cryptoContributionSgd: number
): number {
  return totalCryptoCashContributed - cryptoContributionSgd;
}

export function calculateTotalValueSgd(
  cryptoHoldingsValueSgd: number,
  availableTradingCashSgd: number
): number {
  return cryptoHoldingsValueSgd + availableTradingCashSgd;
}

export function calculateCryptoProfitLossSgd(
  cryptoHoldingsValueSgd: number,
  cryptoContributionSgd: number
): number {
  return cryptoHoldingsValueSgd - cryptoContributionSgd;
}

export function calculateCryptoProfitLossPercent(
  cryptoProfitLossSgd: number,
  cryptoContributionSgd: number
): number {
  if (cryptoContributionSgd <= 0) return 0;
  return (cryptoProfitLossSgd / cryptoContributionSgd) * 100;
}

export function buildCryptoTrackerSummary(
  holdings: CryptoHolding[],
  totalCryptoCashContributed: number
): CryptoTrackerSummary {
  const safeCashContributed = coerceNumber(totalCryptoCashContributed);
  const cryptoHoldingsValueSgd = calculateCryptoHoldingsValue(holdings);
  const cryptoContributionSgd = calculateCryptoContribution(holdings);
  const availableTradingCashSgd = calculateAvailableTradingCash(
    safeCashContributed,
    cryptoContributionSgd
  );
  const cryptoProfitLossSgd = calculateCryptoProfitLossSgd(
    cryptoHoldingsValueSgd,
    cryptoContributionSgd
  );
  const cryptoProfitLossPercent = calculateCryptoProfitLossPercent(
    cryptoProfitLossSgd,
    cryptoContributionSgd
  );

  return {
    totalValueSgd: calculateTotalValueSgd(
      cryptoHoldingsValueSgd,
      availableTradingCashSgd
    ),
    cryptoHoldingsValueSgd,
    cryptoContributionSgd,
    availableTradingCashSgd,
    totalCryptoCashContributed: safeCashContributed,
    cryptoProfitLossSgd,
    cryptoProfitLossPercent,
    holdingCount: holdings.length,
  };
}

export function plTrend(
  value: number
): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}

/** Re-export rows builder for convenience in services. */
export { buildCryptoHoldingRows };
