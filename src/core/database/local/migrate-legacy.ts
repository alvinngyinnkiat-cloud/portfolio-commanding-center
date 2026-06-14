import type {
  ContributionTransaction,
  Goal,
  DailySnapshot,
  DashboardSettings,
} from "@/core/domain/types";
import {
  DEFAULT_DASHBOARD_SETTINGS,
  isDemoContributions,
  isDemoGoals,
  isDemoManualValues,
  isDemoSnapshots,
} from "@/core/domain/defaults";
import { DEFAULT_STOCK_USD_ALLOCATION_PERCENT } from "@/core/calculations/contribution-cash";
import { STORAGE_KEYS } from "./storage-keys";
import { readJson, writeJson } from "./local-storage";
import { normalizeDashboardSettings } from "./normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";

const SCHEMA_VERSION_KEY = "portfolio:schema_version";
const CURRENT_SCHEMA_VERSION = 9;

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

function normalizeContributions(
  contributions: ContributionTransaction[]
): ContributionTransaction[] {
  return contributions.map((c) => {
    if (c.category === "stock" && c.usdAllocationPercent === undefined) {
      return { ...c, usdAllocationPercent: DEFAULT_STOCK_USD_ALLOCATION_PERCENT };
    }
    return c;
  });
}

function purgeDemoSeedDataIfNeeded(): void {
  const contributions = readJson<ContributionTransaction[]>(
    STORAGE_KEYS.contributions,
    []
  );
  if (isDemoContributions(contributions)) {
    writeJson(STORAGE_KEYS.contributions, []);
  }

  const goals = readJson<Goal[]>(STORAGE_KEYS.goals, []);
  if (isDemoGoals(goals)) {
    writeJson(STORAGE_KEYS.goals, []);
  }

  const snapshots = readJson<DailySnapshot[]>(STORAGE_KEYS.snapshots, []);
  if (isDemoSnapshots(snapshots)) {
    writeJson(STORAGE_KEYS.snapshots, []);
  }

  const settings = readJson<DashboardSettings>(
    STORAGE_KEYS.dashboardSettings,
    DEFAULT_DASHBOARD_SETTINGS
  );
  if (isDemoManualValues(settings.manualValues)) {
    writeJson(
      STORAGE_KEYS.dashboardSettings,
      normalizeDashboardSettings({
        ...settings,
        manualValues: DEFAULT_DASHBOARD_SETTINGS.manualValues,
      })
    );
  }
}

export function migrateLegacyStorageIfNeeded(): void {
  if (typeof window === "undefined") return;
  if (hasNewStorage()) return;

  const legacy = readJson<LegacyBlob | null>(STORAGE_KEYS.legacy, null);

  const settings: DashboardSettings = legacy
    ? normalizeDashboardSettings({
        usdSgdFxRate: legacy.usdSgdFxRate,
        stockCashUsd: legacy.stockCashUsd,
        cryptoCashSgd: legacy.cryptoCashSgd,
        manualValues: legacy.manualValues,
      })
    : DEFAULT_DASHBOARD_SETTINGS;

  writeJson(STORAGE_KEYS.dashboardSettings, settings);
  writeJson(
    STORAGE_KEYS.contributions,
    normalizeContributions(legacy?.contributions ?? [])
  );
  writeJson(STORAGE_KEYS.goals, legacy?.goals ?? []);
  writeJson(STORAGE_KEYS.snapshots, legacy?.dailySnapshots ?? []);
}

export function migrateSchemaIfNeeded(): void {
  if (typeof window === "undefined") return;

  const version = readJson<number>(SCHEMA_VERSION_KEY, 0);

  if (version < 3) {
    const raw = readJson(STORAGE_KEYS.dashboardSettings, {});
    writeJson(STORAGE_KEYS.dashboardSettings, normalizeDashboardSettings(raw));

    const contributions = readJson<ContributionTransaction[]>(
      STORAGE_KEYS.contributions,
      []
    );
    writeJson(
      STORAGE_KEYS.contributions,
      normalizeContributions(contributions)
    );
  }

  if (version < 4) {
    const raw = readJson(STORAGE_KEYS.dashboardSettings, {});
    writeJson(STORAGE_KEYS.dashboardSettings, normalizeDashboardSettings(raw));
  }

  if (version < 5) {
    const raw = readJson(STORAGE_KEYS.dashboardSettings, {});
    writeJson(STORAGE_KEYS.dashboardSettings, normalizeDashboardSettings(raw));
  }

  if (version < 6) {
    const snapshots = readJson<DailySnapshot[]>(STORAGE_KEYS.snapshots, []);
    writeJson(
      STORAGE_KEYS.snapshots,
      snapshots.map((snapshot) => normalizeDailySnapshot(snapshot))
    );
  }

  if (version < 7) {
    const snapshots = readJson<DailySnapshot[]>(STORAGE_KEYS.snapshots, []);
    writeJson(
      STORAGE_KEYS.snapshots,
      snapshots.map((snapshot) => normalizeDailySnapshot(snapshot))
    );
  }

  if (version < 8) {
    const snapshots = readJson<DailySnapshot[]>(STORAGE_KEYS.snapshots, []);
    writeJson(
      STORAGE_KEYS.snapshots,
      snapshots.map((snapshot) => normalizeDailySnapshot(snapshot))
    );
  }

  if (version < 9) {
    purgeDemoSeedDataIfNeeded();
  }

  if (version < CURRENT_SCHEMA_VERSION) {
    writeJson(SCHEMA_VERSION_KEY, CURRENT_SCHEMA_VERSION);
  }
}
