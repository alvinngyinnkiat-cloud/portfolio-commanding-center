import type {
  CalculatedHolding,
  ContributionTransaction,
  StockTrackerSummary,
  StockTransaction,
} from "@/core/domain/types";
import type { OptionsTrade } from "@/core/domain/types/options";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd, sgdToUsd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { summarizeStockContributionFromDeposits } from "@/core/calculations/stocks/contributions";
import { summarizeNetStockCashBreakdown } from "@/core/calculations/stocks/contributions";
import { calculateSgAvailableCashSgd } from "@/core/calculations/stocks/trading-cash";
import { calculateUsAvailableCashUsd } from "@/core/calculations/us-cash";
import { buildUsEffectiveCashFields } from "@/core/calculations/us-cash/effective-cash";
import { calculateNetOptionsMarketValueUsd } from "@/core/calculations/options/net-options-market-value";

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
  systemCalculatedUsCashUsd: number;
  brokerUsdCashOverrideUsd: number | null;
  historicalReconciliationDifferenceUsd: number | null;
  usesBrokerUsdCashOverride: boolean;
  sgAvailableTradingCashSgd: number;
  usTotalValueUsd: number;
  usTotalValueSgd: number;
  /** Broker-style open options market value from Module 5 — null when unmarked. */
  netOptionsMarketValueUsd: number | null;
  netOptionsMarketValueSgd: number | null;
  /** US holdings + US cash + net options market value (SGD). */
  totalUsNetValueUsd: number;
  totalUsNetValueSgd: number;
  sgTotalValueSgd: number;
  allMarketTotalValueSgd: number;
  usMarketPLUsd: number;
  usMarketPLSgd: number;
  sgMarketPLSgd: number;
  allMarketPLSgd: number;
  fxRate: number | null;
  fxRateValid: boolean;
}

export interface UsStockHoldingsDisplay {
  sgd: number;
  usd: number;
}

/** US stock holdings for Module 2 summary cards — original holdings + signed net options. */
export function deriveUsStockHoldingsDisplay(
  summary: Pick<
    StockPortfolioSummary,
    | "usMarketValueSgd"
    | "usMarketValueUsd"
    | "netOptionsMarketValueSgd"
    | "netOptionsMarketValueUsd"
  >
): UsStockHoldingsDisplay {
  const netOptionsSgd = summary.netOptionsMarketValueSgd ?? 0;
  const netOptionsUsd = summary.netOptionsMarketValueUsd ?? 0;

  return {
    sgd: summary.usMarketValueSgd + netOptionsSgd,
    usd: summary.usMarketValueUsd + netOptionsUsd,
  };
}

/** Module 2 summary card total — stock holdings + US cash (options shown for reference only). */
export function deriveUsSummaryCardTotalNetValueSgd(
  summary: Pick<
    StockPortfolioSummary,
    | "usMarketValueSgd"
    | "usMarketValueUsd"
    | "netOptionsMarketValueSgd"
    | "netOptionsMarketValueUsd"
    | "usAvailableTradingCashSgd"
  >
): number {
  const usStockHoldings = deriveUsStockHoldingsDisplay(summary);
  return usStockHoldings.sgd + summary.usAvailableTradingCashSgd;
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
  totalUsNetValueSgd: number,
  sgTotalValueSgd: number
): number {
  return totalUsNetValueSgd + sgTotalValueSgd;
}

/** Module 2 capital model — aggregate summary for adapter and services. */
export function buildStockTrackerSummary(
  holdings: CalculatedHolding[],
  contributions: ContributionTransaction[],
  transactions: StockTransaction[],
  fxRate: number | null,
  optionsTrades: OptionsTrade[] = [],
  fxConversions: StockFxConversion[] = [],
  brokerUsdCashOverride: number | null = null
): StockTrackerSummary {
  const holdingsSummary = summarizeStockHoldings(holdings, fxRate);
  const netCash = summarizeNetStockCashBreakdown(contributions, fxConversions);
  const contribution = summarizeStockContributionFromDeposits(
    contributions,
    fxConversions,
    fxRate
  );

  const systemCalculatedUsCashUsd = calculateUsAvailableCashUsd({
    contributions,
    fxConversions,
    stockTransactions: transactions,
    fxRate,
    optionsTrades,
  });
  const usCash = buildUsEffectiveCashFields(
    systemCalculatedUsCashUsd,
    brokerUsdCashOverride
  );
  const usAvailableTradingCashUsd = usCash.usAvailableTradingCashUsd;
  const sgAvailableTradingCashSgd = calculateSgAvailableCashSgd(
    netCash.sgNetStockCashContributedSgd,
    transactions
  );
  const usAvailableTradingCashSgd =
    isValidFxRate(fxRate) && fxRate != null
      ? usdToSgd(usAvailableTradingCashUsd, fxRate)
      : 0;
  const netOptionsMarketValueUsd = calculateNetOptionsMarketValueUsd(optionsTrades);
  const netOptionsMarketValueSgd =
    netOptionsMarketValueUsd != null && isValidFxRate(fxRate) && fxRate != null
      ? usdToSgd(netOptionsMarketValueUsd, fxRate)
      : null;
  const totalUsNetValueSgd =
    holdingsSummary.usMarketValueSgd +
    usAvailableTradingCashSgd +
    (netOptionsMarketValueSgd ?? 0);
  const sgTotalValueSgd =
    holdingsSummary.sgMarketValueSgd + sgAvailableTradingCashSgd;
  const usMarketValueSgd =
    holdingsSummary.usMarketValueSgd + usAvailableTradingCashSgd;
  const sgMarketValueSgd = sgTotalValueSgd;
  const availableTradingCashSgd =
    usAvailableTradingCashSgd + sgAvailableTradingCashSgd;
  const totalStockValueSgd = calculateTotalStockValueSgd(
    totalUsNetValueSgd,
    sgTotalValueSgd
  );
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
    systemCalculatedUsCashUsd: usCash.systemCalculatedUsCashUsd,
    brokerUsdCashOverrideUsd: usCash.brokerUsdCashOverrideUsd,
    historicalReconciliationDifferenceUsd:
      usCash.historicalReconciliationDifferenceUsd,
    usesBrokerUsdCashOverride: usCash.usesBrokerUsdCashOverride,
    sgAvailableTradingCashSgd,
    usMarketValueSgd,
    sgMarketValueSgd,
    totalStockValueSgd,
    netStockCashContributedSgd: netCash.netStockCashContributedSgd,
    usStockContributionSgd: contribution.usStockContributionSgd,
    sgStockContributionSgd: contribution.sgStockContributionSgd,
    openPositionCount: holdingsSummary.openPositionCount,
    netOptionsMarketValueUsd,
    netOptionsMarketValueSgd,
  };
}

export function buildStockPortfolioSummary(
  holdings: CalculatedHolding[],
  contributions: ContributionTransaction[],
  transactions: StockTransaction[],
  fxRate: number | null,
  optionsTrades: OptionsTrade[] = [],
  fxConversions: StockFxConversion[] = [],
  brokerUsdCashOverride: number | null = null
): StockPortfolioSummary {
  const fxRateValid = isValidFxRate(fxRate);
  const holdingsSummary = summarizeStockHoldings(holdings, fxRate);
  const netCash = summarizeNetStockCashBreakdown(contributions, fxConversions);
  const contribution = summarizeStockContributionFromDeposits(
    contributions,
    fxConversions,
    fxRate
  );

  const systemCalculatedUsCashUsd = calculateUsAvailableCashUsd({
    contributions,
    fxConversions,
    stockTransactions: transactions,
    fxRate,
    optionsTrades,
  });
  const usCash = buildUsEffectiveCashFields(
    systemCalculatedUsCashUsd,
    brokerUsdCashOverride
  );
  const usAvailableTradingCashUsd = usCash.usAvailableTradingCashUsd;
  const sgAvailableTradingCashSgd = calculateSgAvailableCashSgd(
    netCash.sgNetStockCashContributedSgd,
    transactions
  );

  const usAvailableTradingCashSgd =
    fxRateValid && fxRate != null
      ? usdToSgd(usAvailableTradingCashUsd, fxRate)
      : 0;

  const netOptionsMarketValueUsd = calculateNetOptionsMarketValueUsd(optionsTrades);
  const netOptionsMarketValueSgd =
    netOptionsMarketValueUsd != null && fxRateValid && fxRate != null
      ? usdToSgd(netOptionsMarketValueUsd, fxRate)
      : null;

  const usTotalValueUsd =
    holdingsSummary.usMarketValueUsd + usAvailableTradingCashUsd;
  const totalUsNetValueUsd =
    usTotalValueUsd + (netOptionsMarketValueUsd ?? 0);
  const usTotalValueSgd =
    fxRateValid && fxRate != null
      ? usdToSgd(usTotalValueUsd, fxRate)
      : holdingsSummary.usMarketValueSgd;
  const totalUsNetValueSgd =
    holdingsSummary.usMarketValueSgd +
    usAvailableTradingCashSgd +
    (netOptionsMarketValueSgd ?? 0);
  const sgTotalValueSgd =
    holdingsSummary.sgMarketValueSgd + sgAvailableTradingCashSgd;
  const allMarketTotalValueSgd = calculateTotalStockValueSgd(
    totalUsNetValueSgd,
    sgTotalValueSgd
  );

  const usMarketPLSgd = totalUsNetValueSgd - contribution.usStockContributionSgd;
  const usMarketPLUsd =
    fxRateValid && fxRate != null
      ? sgdToUsd(usMarketPLSgd, fxRate)
      : totalUsNetValueUsd - contribution.usStockContributionUsd;
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
    systemCalculatedUsCashUsd: usCash.systemCalculatedUsCashUsd,
    brokerUsdCashOverrideUsd: usCash.brokerUsdCashOverrideUsd,
    historicalReconciliationDifferenceUsd:
      usCash.historicalReconciliationDifferenceUsd,
    usesBrokerUsdCashOverride: usCash.usesBrokerUsdCashOverride,
    sgAvailableTradingCashSgd,
    usTotalValueUsd,
    usTotalValueSgd,
    netOptionsMarketValueUsd,
    netOptionsMarketValueSgd,
    totalUsNetValueUsd,
    totalUsNetValueSgd,
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
