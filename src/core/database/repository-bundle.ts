import type { ContributionRepository } from "./repositories/contribution-repository";
import type { GoalRepository } from "./repositories/goal-repository";
import type { SnapshotRepository } from "./repositories/snapshot-repository";
import type { DashboardSettingsRepository } from "./repositories/dashboard-settings-repository";
import type { StockTransactionRepository } from "./repositories/stock-transaction-repository";
import type { StockInstrumentRepository } from "./repositories/stock-instrument-repository";
import type { StockPriceRepository } from "./repositories/stock-price-repository";
import type { StockPriceScheduleRepository } from "./repositories/stock-price-schedule-repository";
import type { StockDailyCandleRepository } from "./repositories/stock-daily-candle-repository";
import type { StockWeeklyCandleRepository } from "./repositories/stock-weekly-candle-repository";
import type {
  ScannerResultRepository,
  ScannerScheduleRepository,
} from "./repositories/scanner-repository";
import type { ScannerWatchlistRepository } from "./repositories/scanner-watchlist-repository";
import type { CryptoHoldingRepository } from "./repositories/crypto-holding-repository";
import type { CryptoAllocationRepository } from "./repositories/crypto-allocation-repository";
import type {
  OptionsTradeRepository,
  OptionsSettingsRepository,
} from "./repositories/options-repository";

export interface RepositoryBundle {
  contributions: ContributionRepository;
  goals: GoalRepository;
  snapshots: SnapshotRepository;
  dashboardSettings: DashboardSettingsRepository;
  stockTransactions: StockTransactionRepository;
  stockInstruments: StockInstrumentRepository;
  stockPrices: StockPriceRepository;
  stockPriceSchedule: StockPriceScheduleRepository;
  stockDailyCandles: StockDailyCandleRepository;
  stockWeeklyCandles: StockWeeklyCandleRepository;
  scannerResults: ScannerResultRepository;
  scannerSchedule: ScannerScheduleRepository;
  scannerWatchlist: ScannerWatchlistRepository;
  cryptoHoldings: CryptoHoldingRepository;
  cryptoAllocation: CryptoAllocationRepository;
  optionsTrades: OptionsTradeRepository;
  optionsSettings: OptionsSettingsRepository;
}
