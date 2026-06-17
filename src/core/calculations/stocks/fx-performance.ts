import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { usdToSgd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";

export interface FxConversionTotals {
  /** Net SGD sent via SGD → USD conversions (minus USD → SGD reversals). */
  totalSgdUsed: number;
  /** Net USD received via FX conversions only. */
  totalUsdConverted: number;
}

export interface FxPerformanceMetrics {
  /** Total SGD used for SGD → USD conversions (informational). */
  fxCostBasisSgd: number;
  /** Total USD received from FX conversion records only. */
  totalUsdConverted: number;
  /** Total USD Converted × current FX rate. */
  convertedUsdValueSgd: number;
  fxGainLossSgd: number;
  fxRateValid: boolean;
}

/** Aggregate SGD used and USD received — FX conversion transactions only. */
export function calculateFxConversionTotals(
  fxConversions: StockFxConversion[]
): FxConversionTotals {
  let totalSgdUsed = 0;
  let totalUsdConverted = 0;

  for (const fx of fxConversions) {
    if (fx.direction === "sgd_to_usd") {
      totalSgdUsed += fx.sgdAmount;
      totalUsdConverted += fx.usdAmount;
      continue;
    }

    totalSgdUsed -= fx.sgdAmount;
    totalUsdConverted -= fx.usdAmount;
  }

  return { totalSgdUsed, totalUsdConverted };
}

export function buildFxPerformanceMetrics(
  fxConversions: StockFxConversion[],
  currentFxRate: number | null
): FxPerformanceMetrics {
  const fxRateValid = isValidFxRate(currentFxRate);
  const { totalSgdUsed, totalUsdConverted } =
    calculateFxConversionTotals(fxConversions);

  const convertedUsdValueSgd =
    fxRateValid && currentFxRate != null
      ? usdToSgd(totalUsdConverted, currentFxRate)
      : 0;
  const fxGainLossSgd = convertedUsdValueSgd - totalSgdUsed;

  return {
    fxCostBasisSgd: totalSgdUsed,
    totalUsdConverted,
    convertedUsdValueSgd,
    fxGainLossSgd,
    fxRateValid,
  };
}
