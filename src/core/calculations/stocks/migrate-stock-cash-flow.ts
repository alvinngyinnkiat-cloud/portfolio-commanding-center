import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  calculateStockAllocation,
  normalizeStockUsdAllocationPercent,
  resolveContributionFxRate,
} from "@/core/calculations/contribution-cash";
import { generateId } from "@/core/database/local/local-storage";

export const MIGRATED_STOCK_FX_ID_PREFIX = "migrated-fx-";

function hasLegacyStockAllocation(tx: ContributionTransaction): boolean {
  if (tx.category !== "stock") return false;
  const usdPct = normalizeStockUsdAllocationPercent(tx.usdAllocationPercent);
  return usdPct > 0;
}

/**
 * Splits legacy stock deposits (USD allocation %) into:
 * - full-SGD deposits (allocation fields cleared)
 * - synthetic FX conversion rows preserving historical USD cash
 */
export function migrateLegacyStockDepositsToCashFlow(
  contributions: ContributionTransaction[],
  fxConversions: StockFxConversion[],
  fallbackFxRate: number
): {
  contributions: ContributionTransaction[];
  fxConversions: StockFxConversion[];
} {
  const nextFx = [...fxConversions];
  const existingIds = new Set(nextFx.map((row) => row.id));

  const nextContributions = contributions.map((tx) => {
    if (!hasLegacyStockAllocation(tx)) {
      if (tx.category !== "stock") return tx;
      const { usdAllocationPercent: _u, fxRate: _f, ...rest } = tx;
      return rest;
    }

    const fxRate = resolveContributionFxRate(tx, fallbackFxRate);
    const allocation = calculateStockAllocation(
      tx.amountSgd,
      tx.usdAllocationPercent,
      fxRate
    );

    if (allocation.usdAmountSgd > 0 && allocation.usdAmountUsd > 0) {
      const syntheticId = `${MIGRATED_STOCK_FX_ID_PREFIX}${tx.id}`;
      if (!existingIds.has(syntheticId)) {
        nextFx.push({
          id: syntheticId,
          date: tx.date,
          direction: "sgd_to_usd",
          sgdAmount: allocation.usdAmountSgd,
          usdAmount: allocation.usdAmountUsd,
          notes: "Migrated from deposit USD allocation",
          createdAt: new Date().toISOString(),
        });
        existingIds.add(syntheticId);
      }
    }

    const { usdAllocationPercent: _u, fxRate: _f, ...rest } = tx;
    return rest;
  });

  return { contributions: nextContributions, fxConversions: nextFx };
}

export function createStockFxConversionId(): string {
  return generateId();
}
