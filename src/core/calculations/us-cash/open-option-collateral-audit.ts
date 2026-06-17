import type { OptionsTrade } from "@/core/domain/types/options";
import {
  allocateOpenAmountsForContracts,
  getRemainingContracts,
  scaleMaxRiskForRemaining,
} from "@/core/calculations/options/contract-tracking";
import { formatOptionsStrategy } from "@/core/calculations/options/helpers";
import { calculateOpenOptionMarketValueUsd } from "@/core/calculations/options/net-options-market-value";

export interface OpenOptionCollateralRow {
  tradeId: string;
  ticker: string;
  strategy: string;
  premiumReceivedUsd: number;
  currentMarketValueUsd: number | null;
  openingFeesUsd: number;
  netOpenCashContributionUsd: number;
  maxRiskUsd: number;
}

export interface OpenOptionCollateralSummary {
  openTradesCount: number;
  totalOpenRiskUsd: number;
  premiumReceivedUsd: number;
  currentMarketValueUsd: number | null;
  openingFeesUsd: number;
  netOpenCashContributionUsd: number;
  estimatedReservedCapitalUsd: number;
}

export interface BrokerCollateralComparison {
  brokerUsdCash: number | null;
  brokerCashDifferenceUsd: number | null;
  estimatedReservedCapitalUsd: number;
  differenceVsOpenRiskPercent: number | null;
  /** null when broker cash is not entered. */
  collateralExplainsDifference: boolean | null;
}

/** Net Open Cash Contribution = Premium Received − Current Market Value − Opening Fees */
export function computeNetOpenCashContributionUsd(input: {
  premiumReceivedUsd: number;
  currentMarketValueUsd: number | null;
  openingFeesUsd: number;
}): number {
  const current = input.currentMarketValueUsd ?? 0;
  return input.premiumReceivedUsd - current - input.openingFeesUsd;
}

export function buildOpenOptionCollateralRow(
  trade: OptionsTrade
): OpenOptionCollateralRow | null {
  if (trade.status !== "open") {
    return null;
  }

  const remaining = getRemainingContracts(trade);
  if (remaining <= 0) {
    return null;
  }

  const allocated = allocateOpenAmountsForContracts(trade, remaining);
  const currentMarketValueUsd = calculateOpenOptionMarketValueUsd(trade);

  return {
    tradeId: trade.id,
    ticker: trade.underlying,
    strategy: formatOptionsStrategy(trade.strategy, trade.strategyLabel),
    premiumReceivedUsd: allocated.openPremiumUsd,
    currentMarketValueUsd,
    openingFeesUsd: allocated.openFeesUsd,
    netOpenCashContributionUsd: computeNetOpenCashContributionUsd({
      premiumReceivedUsd: allocated.openPremiumUsd,
      currentMarketValueUsd,
      openingFeesUsd: allocated.openFeesUsd,
    }),
    maxRiskUsd: scaleMaxRiskForRemaining(trade),
  };
}

export function buildOpenOptionCollateralRows(
  trades: OptionsTrade[]
): OpenOptionCollateralRow[] {
  return trades
    .map((trade) => buildOpenOptionCollateralRow(trade))
    .filter((row): row is OpenOptionCollateralRow => row != null)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function summarizeOpenOptionCollateral(
  rows: OpenOptionCollateralRow[]
): OpenOptionCollateralSummary {
  let totalOpenRiskUsd = 0;
  let premiumReceivedUsd = 0;
  let currentMarketValueUsd = 0;
  let hasMarkedValue = false;
  let openingFeesUsd = 0;
  let netOpenCashContributionUsd = 0;

  for (const row of rows) {
    totalOpenRiskUsd += row.maxRiskUsd;
    premiumReceivedUsd += row.premiumReceivedUsd;
    openingFeesUsd += row.openingFeesUsd;
    netOpenCashContributionUsd += row.netOpenCashContributionUsd;
    if (row.currentMarketValueUsd != null) {
      hasMarkedValue = true;
      currentMarketValueUsd += row.currentMarketValueUsd;
    }
  }

  return {
    openTradesCount: rows.length,
    totalOpenRiskUsd,
    premiumReceivedUsd,
    currentMarketValueUsd: hasMarkedValue ? currentMarketValueUsd : null,
    openingFeesUsd,
    netOpenCashContributionUsd,
    estimatedReservedCapitalUsd: totalOpenRiskUsd,
  };
}

const COLLATERAL_MATCH_TOLERANCE_RATIO = 0.02;
const COLLATERAL_MATCH_TOLERANCE_USD = 1;

export function compareBrokerCashToCollateral(input: {
  expectedUsdCash: number;
  brokerUsdCash: number | null;
  estimatedReservedCapitalUsd: number;
}): BrokerCollateralComparison {
  const { expectedUsdCash, brokerUsdCash, estimatedReservedCapitalUsd } = input;

  if (brokerUsdCash == null || !Number.isFinite(brokerUsdCash)) {
    return {
      brokerUsdCash: null,
      brokerCashDifferenceUsd: null,
      estimatedReservedCapitalUsd,
      differenceVsOpenRiskPercent: null,
      collateralExplainsDifference: null,
    };
  }

  const brokerCashDifferenceUsd = expectedUsdCash - brokerUsdCash;
  const differenceVsOpenRiskPercent =
    estimatedReservedCapitalUsd > 0
      ? (brokerCashDifferenceUsd / estimatedReservedCapitalUsd) * 100
      : null;

  const tolerance = Math.max(
    COLLATERAL_MATCH_TOLERANCE_USD,
    estimatedReservedCapitalUsd * COLLATERAL_MATCH_TOLERANCE_RATIO
  );
  const collateralExplainsDifference =
    Math.abs(brokerCashDifferenceUsd - estimatedReservedCapitalUsd) <=
    tolerance;

  return {
    brokerUsdCash,
    brokerCashDifferenceUsd,
    estimatedReservedCapitalUsd,
    differenceVsOpenRiskPercent,
    collateralExplainsDifference,
  };
}
