import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import {
  calculateSgStockFxCashSgd,
  calculateStockDepositNetSgd,
  calculateUsStockFxCashUsd,
} from "@/core/calculations/stocks/cash-flow";

/** Net stock cash from deposit/withdrawal transactions (US/SG allocation split). */
export interface NetStockCashBreakdown {
  usNetStockCashContributedSgd: number;
  sgNetStockCashContributedSgd: number;
  netStockCashContributedSgd: number;
}

/** SG pool seed from deposits and FX conversions — used for SG available cash. */
export function calculateSgNetStockCashContributedSgd(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[] = []
): number {
  return (
    calculateStockDepositNetSgd(contributions) +
    calculateSgStockFxCashSgd(fxConversions)
  );
}

/** Deposits no longer allocate to US in SGD terms. */
export function calculateUsNetStockCashContributedSgd(
  _contributions: ContributionTransaction[]
): number {
  return 0;
}

/** Net stock cash contributed = stock deposits − stock withdrawals. */
export function calculateNetStockCashContributedSgd(
  contributions: ContributionTransaction[]
): number {
  return calculateStockDepositNetSgd(contributions);
}

export function summarizeNetStockCashBreakdown(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[] = []
): NetStockCashBreakdown {
  const sgNetStockCashContributedSgd = calculateSgNetStockCashContributedSgd(
    contributions,
    fxConversions
  );
  return {
    usNetStockCashContributedSgd: 0,
    sgNetStockCashContributedSgd,
    netStockCashContributedSgd: calculateNetStockCashContributedSgd(contributions),
  };
}

/** US net stock cash in USD — sourced from FX conversion transactions. */
export function calculateUsNetStockCashContributedUsd(
  fxConversions: StockFxConversion[]
): number {
  return calculateUsStockFxCashUsd(fxConversions);
}

export interface StockContributionFromDeposits {
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  totalStockContributionSgd: number;
  usStockContributionUsd: number;
}

/** Market-level capital allocation — FX conversions split deposits across US/SG pools. */
export function summarizeStockContributionFromDeposits(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[] = [],
  fxRate: number | null = null
): StockContributionFromDeposits {
  const totalStockContributionSgd = calculateStockDepositNetSgd(contributions);
  const usStockContributionUsd = calculateUsStockFxCashUsd(fxConversions);
  const sgStockContributionSgd = calculateSgNetStockCashContributedSgd(
    contributions,
    fxConversions
  );
  const usStockContributionSgd =
    isValidFxRate(fxRate) && fxRate != null
      ? usdToSgd(usStockContributionUsd, fxRate)
      : 0;

  return {
    usStockContributionUsd,
    sgStockContributionSgd,
    usStockContributionSgd,
    totalStockContributionSgd,
  };
}
