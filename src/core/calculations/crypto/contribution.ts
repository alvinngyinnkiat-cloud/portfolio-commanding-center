import type { CryptoHolding } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";

export function normalizeFeesSgd(feesSgd: number | undefined): number {
  if (feesSgd === undefined || Number.isNaN(feesSgd) || feesSgd < 0) {
    return 0;
  }
  return feesSgd;
}

/** Per-holding cost basis = buy transaction totals only (fees are informational). */
export function calculateHoldingContribution(holding: CryptoHolding): number {
  return coerceNumber(holding.investedSgd);
}

/** Capital deployed into holdings (buy totals only). */
export function calculateCryptoCapitalDeployed(holdings: CryptoHolding[]): number {
  return holdings.reduce(
    (sum, holding) => sum + calculateHoldingContribution(holding),
    0
  );
}

