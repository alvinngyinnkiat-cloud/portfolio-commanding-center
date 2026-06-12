import type {
  ContributionTransaction,
  Goal,
  DailySnapshot,
  DashboardSettings,
} from "@/core/domain/types";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  DEFAULT_CONTRIBUTIONS,
  DEFAULT_GOALS,
  DEFAULT_SNAPSHOTS,
} from "@/core/domain/defaults";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";

interface LegacyBlob {
  usdSgdFxRate?: number;
  stockCashUsd?: number;
  cryptoCashSgd?: number;
  manualValues?: DashboardSettings["manualValues"];
  contributions?: ContributionTransaction[];
  goals?: Goal[];
  dailySnapshots?: DailySnapshot[];
}

function hasNewStorage(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEYS.dashboardSettings) !== null;
}

/**
 * Migrates legacy single-blob localStorage to per-entity keys.
 * Safe to call on every app load.
 */
export function migrateLegacyStorageIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (hasNewStorage()) return;

  const legacy = readJson<LegacyBlob | null>(STORAGE_KEYS.legacy, null);

  const settings: DashboardSettings = legacy
    ? {
        usdSgdFxRate: legacy.usdSgdFxRate ?? DEFAULT_DASHBOARD_SETTINGS.usdSgdFxRate,
        stockCashUsd: legacy.stockCashUsd ?? DEFAULT_DASHBOARD_SETTINGS.stockCashUsd,
        cryptoCashSgd:
          legacy.cryptoCashSgd ?? DEFAULT_DASHBOARD_SETTINGS.cryptoCashSgd,
        manualValues:
          legacy.manualValues ?? DEFAULT_DASHBOARD_SETTINGS.manualValues,
      }
    : DEFAULT_DASHBOARD_SETTINGS;

  writeJson(STORAGE_KEYS.dashboardSettings, settings);
  writeJson(
    STORAGE_KEYS.contributions,
    legacy?.contributions ?? DEFAULT_CONTRIBUTIONS
  );
  writeJson(STORAGE_KEYS.goals, legacy?.goals ?? DEFAULT_GOALS);
  writeJson(
    STORAGE_KEYS.snapshots,
    legacy?.dailySnapshots ?? DEFAULT_SNAPSHOTS
  );
}
