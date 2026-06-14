import type { StockMarket, StockTransaction } from "@/core/domain/types";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";

/** Per buy row — capital deployed = gross amount + associated fees. */
export function calculateBuyContribution(transaction: StockTransaction): number {
  if (transaction.transactionType !== "buy") return 0;
  return transaction.grossAmount + transaction.fees;
}

/** Sum buy contributions for one market in native currency (USD for US, SGD for SG). */
export function calculateMarketStockContribution(
  transactions: StockTransaction[],
  market: StockMarket
): number {
  let total = 0;
  for (const tx of transactions) {
    if (tx.market !== market) continue;
    total += calculateBuyContribution(tx);
  }
  return total;
}

export interface StockContributionFromTransactions {
  usStockContributionUsd: number;
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  totalStockContributionSgd: number;
}

/**
 * Stock Contribution = all buy transactions + associated fees (Module 2 owned).
 * US leg converted to SGD when FX is valid; otherwise US SGD leg is 0.
 */
export function summarizeStockContributionFromTransactions(
  transactions: StockTransaction[],
  fxRate: number | null
): StockContributionFromTransactions {
  const usStockContributionUsd = calculateMarketStockContribution(
    transactions,
    "US"
  );
  const sgStockContributionSgd = calculateMarketStockContribution(
    transactions,
    "SG"
  );

  const usStockContributionSgd =
    isValidFxRate(fxRate) && fxRate != null
      ? usdToSgd(usStockContributionUsd, fxRate)
      : 0;

  return {
    usStockContributionUsd,
    usStockContributionSgd,
    sgStockContributionSgd,
    totalStockContributionSgd: usStockContributionSgd + sgStockContributionSgd,
  };
}
