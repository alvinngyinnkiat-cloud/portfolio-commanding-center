import type { PersistenceCache } from "./cache";
import { createEmptyCache, normalizeCache } from "./cache";
import { migrateLegacyStorageIfNeeded, migrateSchemaIfNeeded } from "@/core/database/local/migrate-legacy";
import { STORAGE_KEYS } from "@/core/database/local/storage-keys";
import { readJson } from "@/core/database/local/local-storage";
import { DEFAULT_CONTRIBUTIONS, DEFAULT_DASHBOARD_SETTINGS, DEFAULT_GOALS, DEFAULT_SNAPSHOTS } from "@/core/domain/defaults";
import { DEFAULT_CRYPTO_ALLOCATION } from "@/core/calculations/crypto/allocation";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import { DEFAULT_SCANNER_WATCHLIST } from "@/core/calculations/scanner/watchlist";
import { normalizeDashboardSettings } from "@/core/database/local/normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";
import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import { normalizeOptionsTradesForStorage } from "@/core/calculations/options/trade-dates";
import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import { LocalScannerWatchlistRepository } from "@/core/database/local/local-scanner-watchlist-repository";

function hasMeaningfulLocalData(): boolean {
  if (typeof window === "undefined") return false;

  const contributions = readJson(STORAGE_KEYS.contributions, DEFAULT_CONTRIBUTIONS);
  const goals = readJson(STORAGE_KEYS.goals, DEFAULT_GOALS);
  const snapshots = readJson(STORAGE_KEYS.snapshots, DEFAULT_SNAPSHOTS);
  const stockTransactions = readJson(STORAGE_KEYS.stockTransactions, []);
  const cryptoHoldings = readJson(STORAGE_KEYS.cryptoHoldings, []);
  const optionsTrades = readJson(STORAGE_KEYS.optionsTrades, []);

  return (
    contributions.length > 0 ||
    goals.length > 0 ||
    snapshots.length > 0 ||
    stockTransactions.length > 0 ||
    cryptoHoldings.length > 0 ||
    optionsTrades.length > 0
  );
}

/** Read all localStorage data after legacy migrations (one-time export source). */
export function exportLocalStorageCache(): PersistenceCache {
  if (typeof window === "undefined") {
    return createEmptyCache();
  }

  migrateLegacyStorageIfNeeded();
  migrateSchemaIfNeeded();

  const watchlistRepo = new LocalScannerWatchlistRepository();

  const cache = createEmptyCache();
  cache.dashboardSettings = normalizeDashboardSettings(
    readJson(STORAGE_KEYS.dashboardSettings, DEFAULT_DASHBOARD_SETTINGS)
  );
  cache.contributions = readJson(STORAGE_KEYS.contributions, DEFAULT_CONTRIBUTIONS);
  cache.goals = readJson(STORAGE_KEYS.goals, DEFAULT_GOALS);
  cache.snapshots = readJson(STORAGE_KEYS.snapshots, DEFAULT_SNAPSHOTS).map(
    (row) => normalizeDailySnapshot(row)
  );
  cache.stockTransactions = readJson(STORAGE_KEYS.stockTransactions, []);
  cache.stockInstruments = readJson(STORAGE_KEYS.stockInstruments, []);
  cache.stockPrices = readJson(STORAGE_KEYS.stockPrices, []).map((row) =>
    normalizeStockPrice(row)
  );
  cache.stockPriceSchedule = readJson(STORAGE_KEYS.stockPriceSchedule, {
    usLastUpdateDate: null,
    sgLastUpdateDate: null,
    usLastCandleUpdateDate: null,
  });
  cache.stockDailyCandles = readJson(STORAGE_KEYS.stockDailyCandles, []);
  cache.stockWeeklyCandles = readJson(STORAGE_KEYS.stockWeeklyCandles, []);
  cache.scannerResults = readJson(STORAGE_KEYS.scannerResults, {
    latest: null,
    previous: null,
  });
  cache.scannerSchedule = readJson(STORAGE_KEYS.scannerSchedule, {
    lastScanDate: null,
    lastSuccessfulScanTime: null,
    failedRefreshCount: 0,
    lastFailedAttemptDate: null,
  });
  cache.scannerWatchlist = watchlistRepo.get();
  cache.cryptoHoldings = readJson(STORAGE_KEYS.cryptoHoldings, []);
  cache.cryptoTrades = readJson(STORAGE_KEYS.cryptoTrades, []);
  cache.cryptoAllocation = readJson(
    STORAGE_KEYS.cryptoAllocationSettings,
    DEFAULT_CRYPTO_ALLOCATION
  );
  cache.optionsTrades = normalizeOptionsTradesForStorage(
    readJson(STORAGE_KEYS.optionsTrades, [])
  );
  cache.optionsSettings = normalizeOptionsSettings(
    readJson(STORAGE_KEYS.optionsSettings, DEFAULT_OPTIONS_SETTINGS)
  );
  cache.stockFxConversions = readJson(STORAGE_KEYS.stockFxConversions, []);

  return normalizeCache(cache);
}

export function localStorageHasExportableData(): boolean {
  if (typeof window === "undefined") return false;
  migrateLegacyStorageIfNeeded();
  migrateSchemaIfNeeded();
  return hasMeaningfulLocalData();
}

export function watchlistStorageKey(entry: WatchlistEntry, index: number): string {
  return `${entry.ticker}-${index}`;
}
