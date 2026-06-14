import type {
  CalculatedHolding,
  ContributionTransaction,
  DashboardStockOutputs,
  StockTrackerSummary,
  StockTransaction,
} from "@/core/domain/types";
import { summarizeStockHoldings } from "@/core/calculations/stocks/summary";
import { buildStockTrackerSummary } from "@/core/calculations/stocks/summary";

/** Stock legs for Dashboard asset breakdown — sourced from Module 2 holdings. */
export interface DashboardStockValues {
  usStocksEtfUsd: number;
  usStocksEtfSgd: number;
  sgStocksSgd: number;
}

/**
 * Maps Stock Tracker holdings into Dashboard stock values.
 * US SGD and SG SGD match Module 2 "US Holdings" / "SG Holdings" summary cards.
 */
export function deriveDashboardStockValues(
  holdings: CalculatedHolding[],
  fxRate: number | null
): DashboardStockValues {
  const summary = summarizeStockHoldings(holdings, fxRate);

  return {
    usStocksEtfUsd: summary.usMarketValueUsd,
    usStocksEtfSgd: summary.usMarketValueSgd,
    sgStocksSgd: summary.sgMarketValueSgd,
  };
}

/** Maps Module 2 capital-model summary into Dashboard-ready outputs. */
export function deriveDashboardStockOutputs(
  summary: StockTrackerSummary
): DashboardStockOutputs {
  return {
    stockHoldingsValueSgd: summary.stockHoldingsValueSgd,
    stockContributionSgd: summary.stockContributionSgd,
    stockProfitLossSgd: summary.stockProfitLossSgd,
    availableTradingCashSgd: summary.availableTradingCashSgd,
    totalStockValueSgd: summary.totalStockValueSgd,
  };
}

/** Builds Module 2 summary from holdings, cash contributions, and ledger. */
export function buildDashboardStockSummary(
  holdings: CalculatedHolding[],
  contributions: ContributionTransaction[],
  transactions: StockTransaction[],
  fxRate: number | null,
  realizedOptionsPlUsd = 0
): StockTrackerSummary {
  return buildStockTrackerSummary(
    holdings,
    contributions,
    transactions,
    fxRate,
    realizedOptionsPlUsd
  );
}
