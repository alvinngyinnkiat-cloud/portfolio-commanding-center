import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import type {
  ContributionTransaction,
  CryptoAllocationSettings,
  CryptoHolding,
  CryptoTrade,
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
import { normalizeCryptoTrades } from "@/core/calculations/crypto/trade-normalize";
import { DEFAULT_DASHBOARD_SETTINGS } from "@/core/domain/defaults";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";
import { DEFAULT_SCANNER_WATCHLIST } from "@/core/calculations/scanner/watchlist";
import { normalizeDashboardSettings } from "@/core/database/local/normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import { normalizeScannerScanRun } from "@/core/calculations/scanner/normalize-scan-result";
import type { ScannerResultsStore } from "@/core/calculations/scanner/scanner-ticker-records";
import { normalizeScannerResultsStore } from "@/core/calculations/scanner/scanner-ticker-records";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";
import { normalizeStockTransactions } from "@/core/calculations/stocks/transaction-normalize";

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
  cryptoTrades: CryptoTrade[];
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
    scannerResults: normalizeScannerResultsStore({ latest: null, previous: null }),
    scannerSchedule: { ...EMPTY_SCHEDULE },
    scannerWatchlist: DEFAULT_SCANNER_WATCHLIST.map((row) => ({ ...row })),
    cryptoHoldings: [],
    cryptoTrades: [],
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
    stockTransactions: normalizeStockTransactions(cache.stockTransactions),
    scannerResults: normalizeScannerResultsStore({
      latest: cache.scannerResults.latest
        ? normalizeScannerScanRun(cache.scannerResults.latest)
        : null,
      previous: cache.scannerResults.previous
        ? normalizeScannerScanRun(cache.scannerResults.previous)
        : null,
      tickerRecords: cache.scannerResults.tickerRecords,
      tickerLatestKeys: cache.scannerResults.tickerLatestKeys,
      lastRefreshRun: cache.scannerResults.lastRefreshRun,
    }),
    optionsSettings: normalizeOptionsSettings(cache.optionsSettings),
    cryptoHoldings: normalizeCryptoHoldings(cache.cryptoHoldings),
    cryptoTrades: normalizeCryptoTrades(cache.cryptoTrades ?? []),
    cryptoAllocation: normalizeCryptoAllocationSettings(cache.cryptoAllocation),
    stockFxConversions: cache.stockFxConversions ?? [],
  };
}
