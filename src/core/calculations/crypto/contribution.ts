import type { CryptoHolding } from "@/core/domain/types";

export function normalizeFeesSgd(feesSgd: number | undefined): number {
  if (feesSgd === undefined || Number.isNaN(feesSgd) || feesSgd < 0) {
    return 0;
  }
  return feesSgd;
}

/** Per-holding capital injected = buy amount + associated fees. */
export function calculateHoldingContribution(holding: CryptoHolding): number {
  return holding.investedSgd + normalizeFeesSgd(holding.feesSgd);
}

/** Crypto Contribution = all buy transactions + associated fees (Module 3 owned). */
export function calculateCryptoContribution(holdings: CryptoHolding[]): number {
  return holdings.reduce(
    (sum, holding) => sum + calculateHoldingContribution(holding),
    0
  );
}
