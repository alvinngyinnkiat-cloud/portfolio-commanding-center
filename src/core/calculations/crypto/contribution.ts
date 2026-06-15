import type { CryptoHolding } from "@/core/domain/types";
import { coerceNumber } from "@/shared/lib/coerce-number";

export function normalizeFeesSgd(feesSgd: number | undefined): number {
  if (feesSgd === undefined || Number.isNaN(feesSgd) || feesSgd < 0) {
    return 0;
  }
  return feesSgd;
}

/** Per-holding capital injected = buy amount + associated fees. */
export function calculateHoldingContribution(holding: CryptoHolding): number {
  return (
    coerceNumber(holding.investedSgd) + normalizeFeesSgd(holding.feesSgd)
  );
}

/** Capital deployed into holdings (buys + fees). Reduces available trading cash only. */
export function calculateCryptoCapitalDeployed(holdings: CryptoHolding[]): number {
  return holdings.reduce(
    (sum, holding) => sum + calculateHoldingContribution(holding),
    0
  );
}
