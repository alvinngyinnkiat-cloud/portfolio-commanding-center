import type { StockPortfolioSummary } from "@/core/calculations/stocks/summary";

export const STOCK_ALLOCATION_US_TARGET_PERCENT = 75;
export const STOCK_ALLOCATION_SG_TARGET_PERCENT = 25;
export const STOCK_ALLOCATION_BAND_LOW_PERCENT = 73;
export const STOCK_ALLOCATION_BAND_HIGH_PERCENT = 77;

export type StockAllocationReminderStatus = "under" | "over" | "on_target";

export interface StockMarketLegAllocation {
  holdingsSgd: number;
  cashSgd: number;
  totalMarketValueSgd: number;
  actualPercent: number;
  targetPercent: number;
  differencePercent: number;
}

export interface StockMarketAllocation {
  us: StockMarketLegAllocation;
  sg: StockMarketLegAllocation;
  totalStockValueSgd: number;
  usAllocationPercent: number;
  sgAllocationPercent: number;
  fxRateValid: boolean;
  reminderStatus: StockAllocationReminderStatus;
  reminderMessage: string;
  rebalancing: StockRebalancingRecommendation;
}

export interface StockRebalancingRecommendation {
  targetUsValueSgd: number;
  usGapSgd: number;
  suggestedSgdConversion: number;
  estimatedUsdReceived: number;
  needsConversion: boolean;
  message: string;
}

export function formatStockRebalancingMessage(
  suggestedSgdConversion: number,
  estimatedUsdReceived: number,
  needsConversion: boolean
): string {
  if (!needsConversion) {
    return "No USD conversion needed.";
  }

  const sgdLabel = `S$${suggestedSgdConversion.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const usdLabel = `US$${estimatedUsdReceived.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return `To reach 75% US allocation, consider converting ${sgdLabel} to approximately ${usdLabel}.`;
}

export function deriveStockRebalancingRecommendation(input: {
  totalStockValueSgd: number;
  currentUsMarketValueSgd: number;
  sgdCash: number;
  fxRate: number | null;
  fxRateValid: boolean;
}): StockRebalancingRecommendation {
  const targetUsValueSgd =
    input.totalStockValueSgd * (STOCK_ALLOCATION_US_TARGET_PERCENT / 100);
  const usGapSgd = targetUsValueSgd - input.currentUsMarketValueSgd;
  const needsConversion = usGapSgd > 0;

  const suggestedSgdConversion = needsConversion
    ? Math.min(usGapSgd, Math.max(0, input.sgdCash))
    : 0;

  const estimatedUsdReceived =
    needsConversion &&
    input.fxRateValid &&
    input.fxRate != null &&
    input.fxRate > 0
      ? suggestedSgdConversion / input.fxRate
      : 0;

  return {
    targetUsValueSgd,
    usGapSgd,
    suggestedSgdConversion,
    estimatedUsdReceived,
    needsConversion,
    message: formatStockRebalancingMessage(
      suggestedSgdConversion,
      estimatedUsdReceived,
      needsConversion
    ),
  };
}

export function deriveStockAllocationReminder(
  usAllocationPercent: number
): { status: StockAllocationReminderStatus; message: string } {
  if (usAllocationPercent < STOCK_ALLOCATION_BAND_LOW_PERCENT) {
    return {
      status: "under",
      message:
        "US market is under target. Consider converting more SGD to USD.",
    };
  }
  if (usAllocationPercent > STOCK_ALLOCATION_BAND_HIGH_PERCENT) {
    return {
      status: "over",
      message:
        "US market is above target. Consider allocating more capital to SG.",
    };
  }
  return {
    status: "on_target",
    message: "Allocation is close to target.",
  };
}

function buildLegAllocation(
  holdingsSgd: number,
  cashSgd: number,
  totalStockValueSgd: number,
  targetPercent: number
): StockMarketLegAllocation {
  const totalMarketValueSgd = holdingsSgd + cashSgd;
  const actualPercent =
    totalStockValueSgd > 0
      ? (totalMarketValueSgd / totalStockValueSgd) * 100
      : 0;

  return {
    holdingsSgd,
    cashSgd,
    totalMarketValueSgd,
    actualPercent,
    targetPercent,
    differencePercent: actualPercent - targetPercent,
  };
}

/** US/SG market values = holdings + available cash per market (SGD). */
export function buildStockMarketAllocation(
  summary: Pick<
    StockPortfolioSummary,
    | "usMarketValueSgd"
    | "sgMarketValueSgd"
    | "usAvailableTradingCashSgd"
    | "sgAvailableTradingCashSgd"
    | "fxRateValid"
    | "fxRate"
  >
): StockMarketAllocation {
  const usMarketValueSgd =
    summary.usMarketValueSgd + summary.usAvailableTradingCashSgd;
  const sgMarketValueSgd =
    summary.sgMarketValueSgd + summary.sgAvailableTradingCashSgd;
  const totalStockValueSgd = usMarketValueSgd + sgMarketValueSgd;

  const usAllocationPercent =
    totalStockValueSgd > 0
      ? (usMarketValueSgd / totalStockValueSgd) * 100
      : 0;
  const sgAllocationPercent =
    totalStockValueSgd > 0
      ? (sgMarketValueSgd / totalStockValueSgd) * 100
      : 0;

  const reminder = summary.fxRateValid
    ? deriveStockAllocationReminder(usAllocationPercent)
    : {
        status: "on_target" as const,
        message: "Set a valid FX rate to evaluate US/SG allocation.",
      };

  const rebalancing = deriveStockRebalancingRecommendation({
    totalStockValueSgd,
    currentUsMarketValueSgd: usMarketValueSgd,
    sgdCash: summary.sgAvailableTradingCashSgd,
    fxRate: summary.fxRate ?? null,
    fxRateValid: summary.fxRateValid,
  });

  return {
    us: buildLegAllocation(
      summary.usMarketValueSgd,
      summary.usAvailableTradingCashSgd,
      totalStockValueSgd,
      STOCK_ALLOCATION_US_TARGET_PERCENT
    ),
    sg: buildLegAllocation(
      summary.sgMarketValueSgd,
      summary.sgAvailableTradingCashSgd,
      totalStockValueSgd,
      STOCK_ALLOCATION_SG_TARGET_PERCENT
    ),
    totalStockValueSgd,
    usAllocationPercent,
    sgAllocationPercent,
    fxRateValid: summary.fxRateValid,
    reminderStatus: reminder.status,
    reminderMessage: reminder.message,
    rebalancing,
  };
}
