import type { CryptoHolding, CryptoTrackerSummary, CryptoTrade } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";
import { calculateCryptoCapitalDeployed } from "./contribution";
import {
  calculateCryptoFeesForMonth,
  calculateCryptoFeesForYear,
  calculateTotalCryptoFeesPaid,
} from "./fees";
import { calculateAvailableTradingCashFromTrades } from "./trades";
import { buildCryptoHoldingRows } from "./holdings";

export function calculateCryptoHoldingsValue(holdings: CryptoHolding[]): number {
  return holdings.reduce((sum, h) => sum + coerceNumber(h.currentValueSgd), 0);
}

/** Crypto Cash = Contribution − total buy amounts (fees excluded). */
export function calculateAvailableTradingCash(
  cryptoContributionSgd: number,
  cryptoBuySpendSgd: number
): number {
  return cryptoContributionSgd - cryptoBuySpendSgd;
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
  totalCryptoCashContributed: number,
  cryptoTrades: CryptoTrade[] = []
): CryptoTrackerSummary {
  const safeCashContributed = coerceNumber(totalCryptoCashContributed);
  const cryptoHoldingsValueSgd = calculateCryptoHoldingsValue(holdings);
  const cryptoContributionSgd = safeCashContributed;
  const availableTradingCashSgd =
    cryptoTrades.length > 0
      ? calculateAvailableTradingCashFromTrades(safeCashContributed, cryptoTrades)
      : calculateAvailableTradingCash(
          safeCashContributed,
          calculateCryptoCapitalDeployed(holdings)
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

  const totalFeesPaidSgd = calculateTotalCryptoFeesPaid(cryptoTrades);
  const feesThisMonthSgd = calculateCryptoFeesForMonth(cryptoTrades);
  const feesThisYearSgd = calculateCryptoFeesForYear(cryptoTrades);

  return {
    totalValueSgd,
    cryptoHoldingsValueSgd,
    cryptoContributionSgd,
    availableTradingCashSgd,
    totalCryptoCashContributed: safeCashContributed,
    cryptoProfitLossSgd,
    cryptoProfitLossPercent,
    holdingCount: holdings.length,
    totalFeesPaidSgd,
    feesThisMonthSgd,
    feesThisYearSgd,
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
