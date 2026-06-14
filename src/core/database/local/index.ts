import {
  migrateLegacyStorageIfNeeded,
  migrateSchemaIfNeeded,
} from "./migrate-legacy";
import { LocalContributionRepository } from "./local-contribution-repository";
import { LocalGoalRepository } from "./local-goal-repository";
import { LocalSnapshotRepository } from "./local-snapshot-repository";
import { LocalDashboardSettingsRepository } from "./local-dashboard-settings-repository";
import { LocalStockTransactionRepository } from "./local-stock-transaction-repository";
import { LocalStockInstrumentRepository } from "./local-stock-instrument-repository";
import { LocalStockPriceRepository } from "./local-stock-price-repository";
import { LocalStockPriceScheduleRepository } from "./local-stock-price-schedule-repository";
import { LocalStockDailyCandleRepository } from "./local-stock-daily-candle-repository";
import { LocalStockWeeklyCandleRepository } from "./local-stock-weekly-candle-repository";
import { LocalScannerResultRepository } from "./local-scanner-result-repository";
import { LocalScannerScheduleRepository } from "./local-scanner-schedule-repository";
import { LocalScannerWatchlistRepository } from "./local-scanner-watchlist-repository";
import { LocalCryptoHoldingRepository } from "./local-crypto-holding-repository";
import { LocalCryptoAllocationRepository } from "./local-crypto-allocation-repository";
import { LocalOptionsTradeRepository } from "./local-options-trade-repository";
import { LocalOptionsSettingsRepository } from "./local-options-settings-repository";

export function createLocalRepositories() {
  migrateLegacyStorageIfNeeded();
  migrateSchemaIfNeeded();
  return {
    contributions: new LocalContributionRepository(),
    goals: new LocalGoalRepository(),
    snapshots: new LocalSnapshotRepository(),
    dashboardSettings: new LocalDashboardSettingsRepository(),
    stockTransactions: new LocalStockTransactionRepository(),
    stockInstruments: new LocalStockInstrumentRepository(),
    stockPrices: new LocalStockPriceRepository(),
    stockPriceSchedule: new LocalStockPriceScheduleRepository(),
    stockDailyCandles: new LocalStockDailyCandleRepository(),
    stockWeeklyCandles: new LocalStockWeeklyCandleRepository(),
    scannerResults: new LocalScannerResultRepository(),
    scannerSchedule: new LocalScannerScheduleRepository(),
    scannerWatchlist: new LocalScannerWatchlistRepository(),
    cryptoHoldings: new LocalCryptoHoldingRepository(),
    cryptoAllocation: new LocalCryptoAllocationRepository(),
    optionsTrades: new LocalOptionsTradeRepository(),
    optionsSettings: new LocalOptionsSettingsRepository(),
  };
}

export { generateId } from "./local-storage";
