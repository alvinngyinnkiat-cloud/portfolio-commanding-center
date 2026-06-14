import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import type {
  ContributionTransaction,
  CryptoAllocationSettings,
  CryptoHolding,
  DailySnapshot,
  DashboardSettings,
  Goal,
  OptionsSettings,
  OptionsTrade,
  ScannerScanRun,
  ScannerScheduleState,
  StockDailyCandle,
  StockInstrument,
  StockPrice,
  StockTransaction,
  StockWeeklyCandle,
} from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import type { StockPriceScheduleState } from "@/core/database/repositories/stock-price-schedule-repository";
import { DEFAULT_CRYPTO_ALLOCATION } from "@/core/calculations/crypto/allocation";
import {
  normalizeCryptoAllocationSettings,
  normalizeCryptoHoldings,
} from "@/core/calculations/crypto/normalize";
import { DEFAULT_DASHBOARD_SETTINGS } from "@/core/domain/defaults";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import { DEFAULT_SCANNER_WATCHLIST } from "@/core/calculations/scanner/watchlist";
import { normalizeDashboardSettings } from "@/core/database/local/normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import { normalizeScannerScanRun } from "@/core/calculations/scanner/normalize-scan-result";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";

export interface ScannerResultsStore {
  latest: ScannerScanRun | null;
  previous: ScannerScanRun | null;
}

export interface PersistenceCache {
  dashboardSettings: DashboardSettings;
  contributions: ContributionTransaction[];
  goals: Goal[];
  snapshots: DailySnapshot[];
  stockTransactions: StockTransaction[];
  stockInstruments: StockInstrument[];
  stockPrices: StockPrice[];
  stockPriceSchedule: StockPriceScheduleState;
  stockDailyCandles: StockDailyCandle[];
  stockWeeklyCandles: StockWeeklyCandle[];
  scannerResults: ScannerResultsStore;
  scannerSchedule: ScannerScheduleState;
  scannerWatchlist: WatchlistEntry[];
  cryptoHoldings: CryptoHolding[];
  cryptoAllocation: CryptoAllocationSettings;
  optionsTrades: OptionsTrade[];
  optionsSettings: OptionsSettings;
  stockFxConversions: StockFxConversion[];
  migratedFromLocal: boolean;
}

const EMPTY_SCHEDULE: ScannerScheduleState = {
  lastScanDate: null,
  lastSuccessfulScanTime: null,
  failedRefreshCount: 0,
  lastFailedAttemptDate: null,
};

const EMPTY_PRICE_SCHEDULE: StockPriceScheduleState = {
  usLastUpdateDate: null,
  sgLastUpdateDate: null,
  usLastCandleUpdateDate: null,
};

export function createEmptyCache(): PersistenceCache {
  return {
    dashboardSettings: DEFAULT_DASHBOARD_SETTINGS,
    contributions: [],
    goals: [],
    snapshots: [],
    stockTransactions: [],
    stockInstruments: [],
    stockPrices: [],
    stockPriceSchedule: { ...EMPTY_PRICE_SCHEDULE },
    stockDailyCandles: [],
    stockWeeklyCandles: [],
    scannerResults: { latest: null, previous: null },
    scannerSchedule: { ...EMPTY_SCHEDULE },
    scannerWatchlist: DEFAULT_SCANNER_WATCHLIST.map((row) => ({ ...row })),
    cryptoHoldings: [],
    cryptoAllocation: { ...DEFAULT_CRYPTO_ALLOCATION },
    optionsTrades: [],
    optionsSettings: { ...DEFAULT_OPTIONS_SETTINGS },
    stockFxConversions: [],
    migratedFromLocal: false,
  };
}

export function normalizeCache(cache: PersistenceCache): PersistenceCache {
  return {
    ...cache,
    dashboardSettings: normalizeDashboardSettings(cache.dashboardSettings),
    snapshots: cache.snapshots.map((row) => normalizeDailySnapshot(row)),
    stockPrices: cache.stockPrices.map((row) => normalizeStockPrice(row)),
    scannerResults: {
      latest: cache.scannerResults.latest
        ? normalizeScannerScanRun(cache.scannerResults.latest)
        : null,
      previous: cache.scannerResults.previous
        ? normalizeScannerScanRun(cache.scannerResults.previous)
        : null,
      },
    optionsSettings: normalizeOptionsSettings(cache.optionsSettings),
    cryptoHoldings: normalizeCryptoHoldings(cache.cryptoHoldings),
    cryptoAllocation: normalizeCryptoAllocationSettings(cache.cryptoAllocation),
    stockFxConversions: cache.stockFxConversions ?? [],
  };
}
