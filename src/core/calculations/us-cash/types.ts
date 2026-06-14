import type { ContributionTransaction, StockTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";

/** Inputs for the shared US brokerage cash pool (portfolio-owned). */
export interface UsCashLedgerInput {
  contributions: ContributionTransaction[];
  fxConversions?: StockFxConversion[];
  stockTransactions: StockTransaction[];
  fxRate: number | null;
  /** Sum of closed options realized P/L in USD — 0 until Module 5 ships. */
  realizedOptionsPlUsd?: number;
}

export interface UsAvailableCashBreakdown {
  usNetStockCashUsd: number;
  stockBuySpendUsd: number;
  stockSellProceedsUsd: number;
  stockDividendsUsd: number;
  standaloneFeesUsd: number;
  realizedOptionsPlUsd: number;
}

export interface UsAvailableCashResult {
  usAvailableCashUsd: number;
  breakdown: UsAvailableCashBreakdown;
}
