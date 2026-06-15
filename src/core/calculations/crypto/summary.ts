import type { CryptoHolding, CryptoTrackerSummary } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { calculateCryptoCapitalDeployed } from "./contribution";
import { buildCryptoHoldingRows } from "./holdings";

export function calculateCryptoHoldingsValue(holdings: CryptoHolding[]): number {
  return holdings.reduce((sum, h) => sum + coerceNumber(h.currentValueSgd), 0);
}

export function calculateAvailableTradingCash(
  totalCryptoCashContributed: number,
  cryptoCapitalDeployedSgd: number
): number {
  return totalCryptoCashContributed - cryptoCapitalDeployedSgd;
}

export function calculateTotalValueSgd(
  cryptoHoldingsValueSgd: number,
  availableTradingCashSgd: number
): number {
  return cryptoHoldingsValueSgd + availableTradingCashSgd;
}

export function calculateCryptoProfitLossSgd(
  cryptoTotalValueSgd: number,
  cryptoContributionSgd: number
): number {
  return cryptoTotalValueSgd - cryptoContributionSgd;
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
  const cryptoContributionSgd = safeCashContributed;
  const cryptoCapitalDeployedSgd = calculateCryptoCapitalDeployed(holdings);
  const availableTradingCashSgd = calculateAvailableTradingCash(
    safeCashContributed,
    cryptoCapitalDeployedSgd
  );
  const totalValueSgd = calculateTotalValueSgd(
    cryptoHoldingsValueSgd,
    availableTradingCashSgd
  );
  const cryptoProfitLossSgd = calculateCryptoProfitLossSgd(
    totalValueSgd,
    cryptoContributionSgd
  );
  const cryptoProfitLossPercent = calculateCryptoProfitLossPercent(
    cryptoProfitLossSgd,
    cryptoContributionSgd
  );

  return {
    totalValueSgd,
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
