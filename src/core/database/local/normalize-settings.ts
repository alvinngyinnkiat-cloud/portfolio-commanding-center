import type { DashboardSettings, ManualPortfolioValues } from "@/core/domain/types";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  normalizeManualPortfolioValues,
} from "@/core/domain/defaults";
import { sgdToUsd } from "@/core/calculations/fx";
import { isValidFxRate } from "@/core/calculations/fx-validation";
import { normalizeBrokerUsdCashOverride } from "@/core/calculations/us-cash/effective-cash";

interface LegacyManualValues extends Partial<ManualPortfolioValues> {
  clientPortfolioSgd?: number;
}

interface LegacyDashboardSettings {
  usdSgdFxRate?: number | null;
  brokerUsdCashOverride?: number | null;
  brokerUsdCashLastUpdated?: string | null;
  stockCashUsd?: number;
  usdTradingCashUsd?: number;
  sgdTradingCashSgd?: number;
  cryptoCashSgd?: number;
  manualValues?: LegacyManualValues;
  cryptoLegacyTradesMigrated?: boolean;
}

function normalizeStoredFxRate(raw: LegacyDashboardSettings): number | null {
  if (raw.usdSgdFxRate === undefined) {
    return DEFAULT_DASHBOARD_SETTINGS.usdSgdFxRate;
  }
  if (raw.usdSgdFxRate === null) {
    return null;
  }
  if (
    typeof raw.usdSgdFxRate === "number" &&
    !Number.isNaN(raw.usdSgdFxRate)
  ) {
    return raw.usdSgdFxRate;
  }
  return null;
}

function normalizeManualValues(
  raw: LegacyManualValues | undefined,
  fxRate: number | null
): ManualPortfolioValues {
  const base = normalizeManualPortfolioValues(raw);

  if (
    raw?.clientPortfolioSgd !== undefined &&
    raw.clientPortfolioUsd === undefined &&
    isValidFxRate(fxRate)
  ) {
    return {
      ...base,
      clientPortfolioUsd: sgdToUsd(raw.clientPortfolioSgd, fxRate!),
    };
  }

  return base;
}

export function normalizeDashboardSettings(
  raw: LegacyDashboardSettings
): DashboardSettings {
  const fxRate = normalizeStoredFxRate(raw);

  return {
    usdSgdFxRate: fxRate,
    manualValues: normalizeManualValues(raw.manualValues, fxRate),
    brokerUsdCashOverride: normalizeBrokerUsdCashOverride(
      raw.brokerUsdCashOverride
    ),
    brokerUsdCashLastUpdated:
      typeof raw.brokerUsdCashLastUpdated === "string" &&
      raw.brokerUsdCashLastUpdated.trim()
        ? raw.brokerUsdCashLastUpdated.trim()
        : null,
    cryptoLegacyTradesMigrated: raw.cryptoLegacyTradesMigrated === true,
  };
}
