import type {
  CryptoTrackerSummary,
  DashboardCryptoOutputs,
} from "@/core/domain/types";

/** Maps Crypto Tracker summary into Dashboard-ready outputs (Module 3 → Dashboard). */
export function deriveDashboardCryptoOutputs(
  summary: CryptoTrackerSummary
): DashboardCryptoOutputs {
  return {
    cryptoTotalValueSgd: summary.totalValueSgd,
    cryptoHoldingsValueSgd: summary.cryptoHoldingsValueSgd,
    cryptoContributionSgd: summary.cryptoContributionSgd,
    cryptoProfitLossSgd: summary.cryptoProfitLossSgd,
    availableTradingCashSgd: summary.availableTradingCashSgd,
    numberOfHoldings: summary.holdingCount,
  };
}
