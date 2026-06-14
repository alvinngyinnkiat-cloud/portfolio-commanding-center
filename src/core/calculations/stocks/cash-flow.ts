import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";

export interface StockCashFlowSummary {
  totalStockContributionSgd: number;
  sgdCashBalanceSgd: number;
  usdCashBalanceUsd: number;
  usdCashValueSgd: number;
  totalAvailableStockCashSgd: number;
  fxRateValid: boolean;
}

/** FX rate implied by a conversion — SGD Amount / USD Amount. */
export function calculateStockFxRate(sgdAmount: number, usdAmount: number): number {
  if (usdAmount <= 0) return 0;
  return sgdAmount / usdAmount;
}

/** Net stock contribution from deposit/withdrawal transactions only. */
export function calculateStockDepositNetSgd(
  contributions: ContributionTransaction[]
): number {
  let total = 0;
  for (const tx of contributions) {
    if (tx.category !== "stock") continue;
    const sign = tx.type === "deposit" ? 1 : -1;
    total += sign * tx.amountSgd;
  }
  return total;
}

export function calculateSgStockFxCashSgd(fxConversions: StockFxConversion[]): number {
  let total = 0;
  for (const fx of fxConversions) {
    if (fx.direction === "usd_to_sgd") total += fx.sgdAmount;
    else total -= fx.sgdAmount;
  }
  return total;
}

export function calculateUsStockFxCashUsd(fxConversions: StockFxConversion[]): number {
  let total = 0;
  for (const fx of fxConversions) {
    if (fx.direction === "sgd_to_usd") total += fx.usdAmount;
    else total -= fx.usdAmount;
  }
  return total;
}

/** SGD cash pool from deposits/withdrawals and FX conversions (no trading ledger). */
export function calculateSgStockCashPoolSgd(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[]
): number {
  return (
    calculateStockDepositNetSgd(contributions) +
    calculateSgStockFxCashSgd(fxConversions)
  );
}

/** USD cash pool from FX conversions only (no trading ledger). */
export function calculateUsStockCashPoolUsd(
  fxConversions: StockFxConversion[]
): number {
  return calculateUsStockFxCashUsd(fxConversions);
}

export function buildStockCashFlowSummary(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[],
  currentFxRate: number | null
): StockCashFlowSummary {
  const fxRateValid = isValidFxRate(currentFxRate);
  const totalStockContributionSgd = calculateStockDepositNetSgd(contributions);
  const sgdCashBalanceSgd = calculateSgStockCashPoolSgd(contributions, fxConversions);
  const usdCashBalanceUsd = calculateUsStockCashPoolUsd(fxConversions);
  const usdCashValueSgd =
    fxRateValid && currentFxRate != null
      ? usdToSgd(usdCashBalanceUsd, currentFxRate)
      : 0;

  return {
    totalStockContributionSgd,
    sgdCashBalanceSgd,
    usdCashBalanceUsd,
    usdCashValueSgd,
    totalAvailableStockCashSgd: sgdCashBalanceSgd + usdCashValueSgd,
    fxRateValid,
  };
}
