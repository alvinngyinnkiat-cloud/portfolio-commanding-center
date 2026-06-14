import type {
  CalculatedHolding,
  ContributionTransaction,
  StockTrackerSummary,
  StockTransaction,
} from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { summarizeStockContributionFromDeposits } from "@/core/calculations/stocks/contributions";
import { summarizeNetStockCashBreakdown } from "@/core/calculations/stocks/contributions";
import { calculateSgAvailableCashSgd } from "@/core/calculations/stocks/trading-cash";
import { calculateUsAvailableCashUsd } from "@/core/calculations/us-cash";

/** UI aggregation — sums derived holding fields; does not alter ledger math. */
export interface StockHoldingsSummary {
  usMarketValueUsd: number;
  usMarketValueSgd: number;
  sgMarketValueSgd: number;
  totalStockHoldingsSgd: number;
  openPositionCount: number;
}

export interface StockPortfolioSummary extends StockHoldingsSummary {
  usStockContributionSgd: number;
  sgStockContributionSgd: number;
  totalStockContributionSgd: number;
  usStockContributionUsd: number;
  usAvailableTradingCashUsd: number;
  usAvailableTradingCashSgd: number;
  sgAvailableTradingCashSgd: number;
  usTotalValueUsd: number;
  usTotalValueSgd: number;
  sgTotalValueSgd: number;
  allMarketTotalValueSgd: number;
  usMarketPLUsd: number;
  usMarketPLSgd: number;
  sgMarketPLSgd: number;
  allMarketPLSgd: number;
  fxRate: number | null;
  fxRateValid: boolean;
}

/** Sum current market values; US SGD leg uses portfolio USD total × FX when valid. */
export function summarizeStockHoldings(
  holdings: CalculatedHolding[],
  fxRate: number | null
): StockHoldingsSummary {
  const us = holdings.filter((h) => h.market === "US");
  const sg = holdings.filter((h) => h.market === "SG");

  const usMarketValueUsd = us.reduce((sum, h) => sum + h.marketValue, 0);
  const sgMarketValueSgd = sg.reduce((sum, h) => sum + h.marketValue, 0);

  const usMarketValueSgd =
    isValidFxRate(fxRate) && usMarketValueUsd > 0
      ? usdToSgd(usMarketValueUsd, fxRate!)
      : us.reduce((sum, h) => sum + (h.sgdValue ?? 0), 0);

  return {
    usMarketValueUsd,
    usMarketValueSgd,
    sgMarketValueSgd,
    totalStockHoldingsSgd: usMarketValueSgd + sgMarketValueSgd,
    openPositionCount: holdings.length,
  };
}

export function calculateStockProfitLossSgd(
  totalStockValueSgd: number,
  stockContributionSgd: number
): number {
  return totalStockValueSgd - stockContributionSgd;
}

export function calculateTotalStockValueSgd(
  stockHoldingsValueSgd: number,
  availableTradingCashSgd: number
): number {
  return stockHoldingsValueSgd + availableTradingCashSgd;
}

/** Module 2 capital model — aggregate summary for adapter and services. */
export function buildStockTrackerSummary(
  holdings: CalculatedHolding[],
  contributions: ContributionTransaction[],
  transactions: StockTransaction[],
  fxRate: number | null,
  realizedOptionsPlUsd = 0,
  fxConversions: StockFxConversion[] = []
): StockTrackerSummary {
  const holdingsSummary = summarizeStockHoldings(holdings, fxRate);
  const netCash = summarizeNetStockCashBreakdown(contributions, fxConversions);
  const contribution = summarizeStockContributionFromDeposits(contributions);

  const usAvailableTradingCashUsd = calculateUsAvailableCashUsd({
    contributions,
    fxConversions,
    stockTransactions: transactions,
    fxRate,
    realizedOptionsPlUsd,
  });
  const sgAvailableTradingCashSgd = calculateSgAvailableCashSgd(
    netCash.sgNetStockCashContributedSgd,
    transactions
  );
  const usAvailableTradingCashSgd =
    isValidFxRate(fxRate) && fxRate != null
      ? usdToSgd(usAvailableTradingCashUsd, fxRate)
      : 0;
  const usMarketValueSgd =
    holdingsSummary.usMarketValueSgd + usAvailableTradingCashSgd;
  const sgMarketValueSgd =
    holdingsSummary.sgMarketValueSgd + sgAvailableTradingCashSgd;
  const availableTradingCashSgd =
    usAvailableTradingCashSgd + sgAvailableTradingCashSgd;
  const totalStockValueSgd = usMarketValueSgd + sgMarketValueSgd;
  const stockProfitLossSgd = calculateStockProfitLossSgd(
    totalStockValueSgd,
    contribution.totalStockContributionSgd
  );

  return {
    stockHoldingsValueSgd: holdingsSummary.totalStockHoldingsSgd,
    stockContributionSgd: contribution.totalStockContributionSgd,
    stockProfitLossSgd,
    availableTradingCashSgd,
    usAvailableTradingCashUsd,
    usAvailableTradingCashSgd,
    sgAvailableTradingCashSgd,
    usMarketValueSgd,
    sgMarketValueSgd,
    totalStockValueSgd,
    netStockCashContributedSgd: netCash.netStockCashContributedSgd,
    usStockContributionSgd: contribution.usStockContributionSgd,
    sgStockContributionSgd: contribution.sgStockContributionSgd,
    openPositionCount: holdingsSummary.openPositionCount,
  };
}

export function buildStockPortfolioSummary(
  holdings: CalculatedHolding[],
  contributions: ContributionTransaction[],
  transactions: StockTransaction[],
  fxRate: number | null,
  realizedOptionsPlUsd = 0,
  fxConversions: StockFxConversion[] = []
): StockPortfolioSummary {
  const fxRateValid = isValidFxRate(fxRate);
  const holdingsSummary = summarizeStockHoldings(holdings, fxRate);
  const netCash = summarizeNetStockCashBreakdown(contributions, fxConversions);
  const contribution = summarizeStockContributionFromDeposits(contributions);

  const usAvailableTradingCashUsd = calculateUsAvailableCashUsd({
    contributions,
    fxConversions,
    stockTransactions: transactions,
    fxRate,
    realizedOptionsPlUsd,
  });
  const sgAvailableTradingCashSgd = calculateSgAvailableCashSgd(
    netCash.sgNetStockCashContributedSgd,
    transactions
  );

  const usAvailableTradingCashSgd =
    fxRateValid && fxRate != null
      ? usdToSgd(usAvailableTradingCashUsd, fxRate)
      : 0;

  const usTotalValueUsd =
    holdingsSummary.usMarketValueUsd + usAvailableTradingCashUsd;
  const usTotalValueSgd =
    fxRateValid && fxRate != null
      ? usdToSgd(usTotalValueUsd, fxRate)
      : holdingsSummary.usMarketValueSgd;
  const sgTotalValueSgd =
    holdingsSummary.sgMarketValueSgd + sgAvailableTradingCashSgd;
  const allMarketTotalValueSgd = usTotalValueSgd + sgTotalValueSgd;

  const usMarketPLUsd =
    usTotalValueUsd - contribution.usStockContributionUsd;
  const usMarketPLSgd = usTotalValueSgd - contribution.usStockContributionSgd;
  const sgMarketPLSgd = sgTotalValueSgd - contribution.sgStockContributionSgd;
  const allMarketPLSgd = calculateStockProfitLossSgd(
    allMarketTotalValueSgd,
    contribution.totalStockContributionSgd
  );

  return {
    ...holdingsSummary,
    usStockContributionSgd: contribution.usStockContributionSgd,
    sgStockContributionSgd: contribution.sgStockContributionSgd,
    totalStockContributionSgd: contribution.totalStockContributionSgd,
    usStockContributionUsd: contribution.usStockContributionUsd,
    usAvailableTradingCashUsd,
    usAvailableTradingCashSgd,
    sgAvailableTradingCashSgd,
    usTotalValueUsd,
    usTotalValueSgd,
    sgTotalValueSgd,
    allMarketTotalValueSgd,
    usMarketPLUsd,
    usMarketPLSgd,
    sgMarketPLSgd,
    allMarketPLSgd,
    fxRate,
    fxRateValid,
  };
}

export function plTrend(
  value: number
): "positive" | "negative" | "neutral" {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "neutral";
}
