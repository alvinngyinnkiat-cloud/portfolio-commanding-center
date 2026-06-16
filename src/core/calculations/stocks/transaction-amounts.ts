import type { StockTransaction } from "@/core/domain/types";

/**
 * Resolve trade gross from persisted fields.
 * Legacy rows may store quantity × price without grossAmount.
 */
export function resolveTransactionGrossAmount(
  transaction: StockTransaction
): number {
  if (transaction.grossAmount > 0) {
    return transaction.grossAmount;
  }

  if (
    (transaction.transactionType === "buy" ||
      transaction.transactionType === "sell") &&
    transaction.quantity > 0 &&
    transaction.price >= 0
  ) {
    return transaction.quantity * transaction.price;
  }

  return transaction.grossAmount;
}

/** Dividend cash credit — prefer netAmount, fall back to gross − fees. */
export function resolveDividendCashAmount(
  transaction: StockTransaction
): number {
  if (transaction.netAmount !== 0) {
    return transaction.netAmount;
  }
  const gross = resolveTransactionGrossAmount(transaction);
  if (gross > 0) {
    return gross - transaction.fees;
  }
  return 0;
}

/** Standalone fee debit. */
export function resolveStandaloneFeeAmount(
  transaction: StockTransaction
): number {
  if (transaction.netAmount !== 0) {
    return Math.abs(transaction.netAmount);
  }
  return transaction.fees;
}
