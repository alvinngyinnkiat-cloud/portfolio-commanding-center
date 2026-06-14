import type {
  ContributionTransaction,
  StockAllocationPreview,
  ContributionCashImpact,
  CashBalances,
} from "@/core/domain/types";
import { sgdToUsd } from "./fx";
import { isValidFxRate } from "./fx-validation";

export const DEFAULT_STOCK_USD_ALLOCATION_PERCENT = 100;

export function normalizeStockUsdAllocationPercent(
  percent: number | undefined
): number {
  if (percent === undefined || Number.isNaN(percent)) {
    return DEFAULT_STOCK_USD_ALLOCATION_PERCENT;
  }
  return Math.min(100, Math.max(0, percent));
}

/** Per-transaction FX with fallback to current global dashboard rate. */
export function resolveContributionFxRate(
  transaction: ContributionTransaction,
  fallbackFxRate: number
): number {
  if (
    transaction.fxRate != null &&
    isValidFxRate(transaction.fxRate)
  ) {
    return transaction.fxRate;
  }
  return fallbackFxRate;
}

export function calculateStockAllocation(
  amountSgd: number,
  usdAllocationPercent: number | undefined,
  fxRate: number
): StockAllocationPreview {
  const usdPct = normalizeStockUsdAllocationPercent(usdAllocationPercent);
  const sgdPct = 100 - usdPct;
  const usdAmountSgd = amountSgd * (usdPct / 100);
  const sgdAmountSgd = amountSgd - usdAmountSgd;
  const usdAmountUsd = sgdToUsd(usdAmountSgd, fxRate);

  return {
    usdAllocationPercent: usdPct,
    sgdAllocationPercent: sgdPct,
    usdAmountSgd,
    sgdAmountSgd,
    usdAmountUsd,
  };
}

/** Cash account deltas for a deposit (withdrawal applies negative via service). */
export function getContributionCashImpact(
  transaction: ContributionTransaction,
  fallbackFxRate: number
): ContributionCashImpact {
  if (transaction.category === "crypto") {
    return {
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: transaction.amountSgd,
    };
  }

  if (transaction.category === "cash") {
    return {
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
    };
  }

  const fxRate = resolveContributionFxRate(transaction, fallbackFxRate);
  const allocation = calculateStockAllocation(
    transaction.amountSgd,
    transaction.usdAllocationPercent,
    fxRate
  );

  return {
    usdTradingCashUsd: allocation.usdAmountUsd,
    sgdTradingCashSgd: allocation.sgdAmountSgd,
    cryptoCashSgd: 0,
  };
}

export interface ContributionCashDisplay {
  fxRate: number | null;
  usdAllocationPercent: number | null;
  sgdAllocationPercent: number | null;
  usdCashAddedUsd: number;
  sgdCashAddedSgd: number;
  cryptoCashAddedSgd: number;
}

/** Signed cash legs for a single transaction (deposit positive, withdrawal negative). */
export function getContributionCashDisplay(
  transaction: ContributionTransaction,
  fallbackFxRate: number
): ContributionCashDisplay {
  const sign = transaction.type === "deposit" ? 1 : -1;
  const impact = getContributionCashImpact(transaction, fallbackFxRate);

  if (transaction.category === "crypto") {
    return {
      fxRate: null,
      usdAllocationPercent: null,
      sgdAllocationPercent: null,
      usdCashAddedUsd: 0,
      sgdCashAddedSgd: 0,
      cryptoCashAddedSgd: sign * impact.cryptoCashSgd,
    };
  }

  if (transaction.category === "cash") {
    return {
      fxRate: null,
      usdAllocationPercent: null,
      sgdAllocationPercent: null,
      usdCashAddedUsd: 0,
      sgdCashAddedSgd: 0,
      cryptoCashAddedSgd: 0,
    };
  }

  const fxRate = resolveContributionFxRate(transaction, fallbackFxRate);
  const allocation = calculateStockAllocation(
    transaction.amountSgd,
    transaction.usdAllocationPercent,
    fxRate
  );

  return {
    fxRate,
    usdAllocationPercent: allocation.usdAllocationPercent,
    sgdAllocationPercent: allocation.sgdAllocationPercent,
    usdCashAddedUsd: sign * impact.usdTradingCashUsd,
    sgdCashAddedSgd: sign * impact.sgdTradingCashSgd,
    cryptoCashAddedSgd: 0,
  };
}

/** Total contribution from transactions — original SGD amounts only. */
export function calculateContributionTotalSgd(
  contributions: ContributionTransaction[]
): number {
  return contributions.reduce((sum, transaction) => {
    const sign = transaction.type === "deposit" ? 1 : -1;
    return sum + sign * transaction.amountSgd;
  }, 0);
}

export function calculateUsdOverdeployment(
  usdHoldingsUsd: number,
  usdTradingCashUsd: number
): number {
  const excess = usdHoldingsUsd - usdTradingCashUsd;
  return excess > 0 ? excess : 0;
}

/** Cash balances derived from contribution transactions (not manually stored). */
export function calculateCashBalancesFromContributions(
  contributions: ContributionTransaction[],
  fallbackFxRate: number
): CashBalances {
  let usdTradingCashUsd = 0;
  let sgdTradingCashSgd = 0;
  let cryptoCashSgd = 0;

  for (const transaction of contributions) {
    const impact = getContributionCashImpact(transaction, fallbackFxRate);
    const sign = transaction.type === "deposit" ? 1 : -1;
    usdTradingCashUsd += sign * impact.usdTradingCashUsd;
    sgdTradingCashSgd += sign * impact.sgdTradingCashSgd;
    cryptoCashSgd += sign * impact.cryptoCashSgd;
  }

  return { usdTradingCashUsd, sgdTradingCashSgd, cryptoCashSgd };
}
