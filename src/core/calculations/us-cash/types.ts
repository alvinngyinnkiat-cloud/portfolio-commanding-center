import type { ContributionTransaction, StockTransaction } from "@/core/domain/types";
import type { OptionsTrade } from "@/core/domain/types/options";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";

/** Inputs for the shared US brokerage cash pool (portfolio-owned). */
export interface UsCashLedgerInput {
  contributions: ContributionTransaction[];
  fxConversions?: StockFxConversion[];
  stockTransactions: StockTransaction[];
  fxRate: number | null;
  /** Options ledger — open and close cash flows drive USD cash reconciliation. */
  optionsTrades?: OptionsTrade[];
  brokerUsdCashOverride?: number | null;
}

export interface UsAvailableCashBreakdown {
  usNetStockCashUsd: number;
  stockBuySpendUsd: number;
  stockSellProceedsUsd: number;
  stockDividendsUsd: number;
  standaloneFeesUsd: number;
  optionOpenCashFlowUsd: number;
  optionNormalCloseCashFlowUsd: number;
  optionManualCloseCashFlowUsd: number;
  optionCloseCashFlowUsd: number;
  netOptionsCashFlowUsd: number;
}

export interface UsAvailableCashResult {
  usAvailableCashUsd: number;
  breakdown: UsAvailableCashBreakdown;
}
