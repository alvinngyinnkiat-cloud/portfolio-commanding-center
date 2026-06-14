import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import {
  DEFAULT_SCANNER_WATCHLIST,
  resolveFetchSymbol,
  SCANNER_CATEGORIES,
} from "@/core/calculations/scanner/watchlist";
import type { ScannerCategory } from "@/core/domain/types/scanner";
import { normalizeTicker } from "@/core/calculations/stocks/normalize";
import { normalizeDashboardSettings } from "@/core/database/local/normalize-settings";
import { normalizeDailySnapshot } from "@/core/calculations/snapshots";
import { normalizeStockPrice } from "@/core/calculations/stocks/price-normalize";
import { normalizeOptionsSettings } from "@/core/domain/defaults-options";
import { normalizeScannerScanRun } from "@/core/calculations/scanner/normalize-scan-result";
import type { DashboardSettingsRepository } from "../repositories/dashboard-settings-repository";
import type { ContributionRepository } from "../repositories/contribution-repository";
import type { GoalRepository } from "../repositories/goal-repository";
import type { SnapshotRepository } from "../repositories/snapshot-repository";
import type { StockTransactionRepository } from "../repositories/stock-transaction-repository";
import type { StockInstrumentRepository } from "../repositories/stock-instrument-repository";
import type { StockPriceRepository } from "../repositories/stock-price-repository";
import type { StockPriceScheduleRepository } from "../repositories/stock-price-schedule-repository";
import type { StockDailyCandleRepository } from "../repositories/stock-daily-candle-repository";
import type { StockWeeklyCandleRepository } from "../repositories/stock-weekly-candle-repository";
import type {
  ScannerResultRepository,
  ScannerScheduleRepository,
} from "../repositories/scanner-repository";
import type { ScannerWatchlistRepository } from "../repositories/scanner-watchlist-repository";
import type { CryptoHoldingRepository } from "../repositories/crypto-holding-repository";
import type { CryptoAllocationRepository } from "../repositories/crypto-allocation-repository";
import type {
  OptionsTradeRepository,
  OptionsSettingsRepository,
} from "../repositories/options-repository";
import type { PersistenceManager } from "./persistence-manager";
import type { RepositoryBundle } from "../repository-bundle";

function normalizeWatchlistEntry(raw: WatchlistEntry): WatchlistEntry {
  const ticker = normalizeTicker(raw.ticker);
  const category = SCANNER_CATEGORIES.includes(raw.category as ScannerCategory)
    ? (raw.category as ScannerCategory)
    : "Custom";
  return {
    ticker,
    fetchSymbol: resolveFetchSymbol(ticker, raw.fetchSymbol),
    category,
    market: "US",
    active: raw.active !== false,
  };
}

class CachedDashboardSettingsRepository implements DashboardSettingsRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    return this.manager.getCache().dashboardSettings;
  }
  save(settings: Parameters<DashboardSettingsRepository["save"]>[0]) {
    this.manager.getCache().dashboardSettings = normalizeDashboardSettings(settings);
    this.manager.queueSettingsSync();
  }
}

class CachedContributionRepository implements ContributionRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().contributions];
  }
  upsert(transaction: Parameters<ContributionRepository["upsert"]>[0]) {
    const list = this.manager.getCache().contributions;
    const idx = list.findIndex((row) => row.id === transaction.id);
    if (idx >= 0) list[idx] = transaction;
    else list.push(transaction);
    this.manager.queueContributionsSync();
  }
  delete(id: string) {
    this.manager.getCache().contributions = this.manager
      .getCache()
      .contributions.filter((row) => row.id !== id);
    this.manager.queueContributionsSync();
  }
  replaceAll(transactions: Parameters<ContributionRepository["replaceAll"]>[0]) {
    this.manager.getCache().contributions = [...transactions];
    this.manager.queueContributionsSync();
  }
}

class CachedGoalRepository implements GoalRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().goals];
  }
  upsert(goal: Parameters<GoalRepository["upsert"]>[0]) {
    const list = this.manager.getCache().goals;
    const idx = list.findIndex((row) => row.id === goal.id);
    if (idx >= 0) list[idx] = goal;
    else list.push(goal);
    this.manager.queueGoalsSync();
  }
  delete(id: string) {
    this.manager.getCache().goals = this.manager
      .getCache()
      .goals.filter((row) => row.id !== id);
    this.manager.queueGoalsSync();
  }
  replaceAll(goals: Parameters<GoalRepository["replaceAll"]>[0]) {
    this.manager.getCache().goals = [...goals];
    this.manager.queueGoalsSync();
  }
}

class CachedSnapshotRepository implements SnapshotRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return this.manager.getCache().snapshots.map((row) => normalizeDailySnapshot(row));
  }
  upsert(snapshot: Parameters<SnapshotRepository["upsert"]>[0]) {
    const normalized = normalizeDailySnapshot(snapshot);
    const list = this.manager.getCache().snapshots;
    const idx = list.findIndex((row) => row.date === normalized.date);
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
    list.sort((a, b) => a.date.localeCompare(b.date));
    this.manager.queueSnapshotsSync();
  }
  delete(date: string) {
    this.manager.getCache().snapshots = this.manager
      .getCache()
      .snapshots.filter((row) => row.date !== date);
    this.manager.queueSnapshotsSync();
  }
  replaceAll(snapshots: Parameters<SnapshotRepository["replaceAll"]>[0]) {
    this.manager.getCache().snapshots = snapshots.map((row) =>
      normalizeDailySnapshot(row)
    );
    this.manager.queueSnapshotsSync();
  }
}

class CachedStockTransactionRepository implements StockTransactionRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().stockTransactions];
  }
  upsert(transaction: Parameters<StockTransactionRepository["upsert"]>[0]) {
    const list = this.manager.getCache().stockTransactions;
    const idx = list.findIndex((row) => row.id === transaction.id);
    if (idx >= 0) list[idx] = transaction;
    else list.push(transaction);
    this.manager.queueStockTransactionsSync();
  }
  delete(id: string) {
    this.manager.getCache().stockTransactions = this.manager
      .getCache()
      .stockTransactions.filter((row) => row.id !== id);
    this.manager.queueStockTransactionsSync();
  }
  replaceAll(transactions: Parameters<StockTransactionRepository["replaceAll"]>[0]) {
    this.manager.getCache().stockTransactions = [...transactions];
    this.manager.queueStockTransactionsSync();
  }
}

class CachedStockInstrumentRepository implements StockInstrumentRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().stockInstruments];
  }
  upsert(instrument: Parameters<StockInstrumentRepository["upsert"]>[0]) {
    const list = this.manager.getCache().stockInstruments;
    const idx = list.findIndex(
      (row) => row.market === instrument.market && row.ticker === instrument.ticker
    );
    if (idx >= 0) list[idx] = instrument;
    else list.push(instrument);
    this.manager.queueSettingsSync();
  }
  delete(market: Parameters<StockInstrumentRepository["delete"]>[0], ticker: string) {
    this.manager.getCache().stockInstruments = this.manager
      .getCache()
      .stockInstruments.filter((row) => !(row.market === market && row.ticker === ticker));
    this.manager.queueSettingsSync();
  }
  replaceAll(instruments: Parameters<StockInstrumentRepository["replaceAll"]>[0]) {
    this.manager.getCache().stockInstruments = [...instruments];
    this.manager.queueSettingsSync();
  }
}

class CachedStockPriceRepository implements StockPriceRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return this.manager.getCache().stockPrices.map((row) => normalizeStockPrice(row));
  }
  upsert(price: Parameters<StockPriceRepository["upsert"]>[0]) {
    const normalized = normalizeStockPrice(price);
    const list = this.manager.getCache().stockPrices;
    const idx = list.findIndex(
      (row) => row.market === normalized.market && row.ticker === normalized.ticker
    );
    if (idx >= 0) list[idx] = normalized;
    else list.push(normalized);
    this.manager.queueSettingsSync();
  }
  delete(market: Parameters<StockPriceRepository["delete"]>[0], ticker: string) {
    this.manager.getCache().stockPrices = this.manager
      .getCache()
      .stockPrices.filter((row) => !(row.market === market && row.ticker === ticker));
    this.manager.queueSettingsSync();
  }
  replaceAll(prices: Parameters<StockPriceRepository["replaceAll"]>[0]) {
    this.manager.getCache().stockPrices = prices.map((row) => normalizeStockPrice(row));
    this.manager.queueSettingsSync();
  }
}

class CachedStockPriceScheduleRepository implements StockPriceScheduleRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    return { ...this.manager.getCache().stockPriceSchedule };
  }
  set(state: Parameters<StockPriceScheduleRepository["set"]>[0]) {
    this.manager.getCache().stockPriceSchedule = { ...state };
    this.manager.queueSettingsSync();
  }
}

class CachedStockDailyCandleRepository implements StockDailyCandleRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().stockDailyCandles];
  }
  listByTicker(market: Parameters<StockDailyCandleRepository["listByTicker"]>[0], ticker: string) {
    const normalized = normalizeTicker(ticker);
    return this.list()
      .filter((row) => row.market === market && row.ticker === normalized)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  replaceForTicker(
    market: Parameters<StockDailyCandleRepository["replaceForTicker"]>[0],
    ticker: string,
    candles: Parameters<StockDailyCandleRepository["replaceForTicker"]>[2]
  ) {
    const normalized = normalizeTicker(ticker);
    const rest = this.manager
      .getCache()
      .stockDailyCandles.filter(
        (row) => !(row.market === market && row.ticker === normalized)
      );
    this.manager.getCache().stockDailyCandles = [...rest, ...candles];
    this.manager.queueSettingsSync();
  }
}

class CachedStockWeeklyCandleRepository implements StockWeeklyCandleRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().stockWeeklyCandles];
  }
  listByTicker(market: Parameters<StockWeeklyCandleRepository["listByTicker"]>[0], ticker: string) {
    const normalized = normalizeTicker(ticker);
    return this.list()
      .filter((row) => row.market === market && row.ticker === normalized)
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  replaceForTicker(
    market: Parameters<StockWeeklyCandleRepository["replaceForTicker"]>[0],
    ticker: string,
    candles: Parameters<StockWeeklyCandleRepository["replaceForTicker"]>[2]
  ) {
    const normalized = normalizeTicker(ticker);
    const rest = this.manager
      .getCache()
      .stockWeeklyCandles.filter(
        (row) => !(row.market === market && row.ticker === normalized)
      );
    this.manager.getCache().stockWeeklyCandles = [...rest, ...candles];
    this.manager.queueSettingsSync();
  }
}

class CachedScannerResultRepository implements ScannerResultRepository {
  constructor(private readonly manager: PersistenceManager) {}
  getLatest() {
    const latest = this.manager.getCache().scannerResults.latest;
    return latest ? normalizeScannerScanRun(latest) : null;
  }
  getPrevious() {
    const previous = this.manager.getCache().scannerResults.previous;
    return previous ? normalizeScannerScanRun(previous) : null;
  }
  save(run: Parameters<ScannerResultRepository["save"]>[0]) {
    const normalized = normalizeScannerScanRun(run);
    const store = this.manager.getCache().scannerResults;
    store.previous = store.latest;
    store.latest = normalized;
    this.manager.queueSettingsSync();
  }
}

class CachedScannerScheduleRepository implements ScannerScheduleRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    return { ...this.manager.getCache().scannerSchedule };
  }
  set(state: Parameters<ScannerScheduleRepository["set"]>[0]) {
    this.manager.getCache().scannerSchedule = { ...state };
    this.manager.queueSettingsSync();
  }
}

class CachedScannerWatchlistRepository implements ScannerWatchlistRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    const stored = this.manager.getCache().scannerWatchlist;
    if (!stored.length) {
      return DEFAULT_SCANNER_WATCHLIST.map(normalizeWatchlistEntry);
    }
    return stored.map(normalizeWatchlistEntry);
  }
  set(entries: WatchlistEntry[]) {
    this.manager.getCache().scannerWatchlist = entries.map(normalizeWatchlistEntry);
    this.manager.queueWatchlistSync();
  }
  reset() {
    this.manager.getCache().scannerWatchlist = DEFAULT_SCANNER_WATCHLIST.map(
      normalizeWatchlistEntry
    );
    this.manager.queueWatchlistSync();
  }
}

class CachedCryptoHoldingRepository implements CryptoHoldingRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().cryptoHoldings];
  }
  upsert(holding: Parameters<CryptoHoldingRepository["upsert"]>[0]) {
    const list = this.manager.getCache().cryptoHoldings;
    const idx = list.findIndex((row) => row.id === holding.id);
    if (idx >= 0) list[idx] = holding;
    else list.push(holding);
    this.manager.queueCryptoHoldingsSync();
  }
  delete(id: string) {
    this.manager.getCache().cryptoHoldings = this.manager
      .getCache()
      .cryptoHoldings.filter((row) => row.id !== id);
    this.manager.queueCryptoHoldingsSync();
  }
  replaceAll(holdings: Parameters<CryptoHoldingRepository["replaceAll"]>[0]) {
    this.manager.getCache().cryptoHoldings = [...holdings];
    this.manager.queueCryptoHoldingsSync();
  }
}

class CachedCryptoAllocationRepository implements CryptoAllocationRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    return { ...this.manager.getCache().cryptoAllocation };
  }
  save(settings: Parameters<CryptoAllocationRepository["save"]>[0]) {
    this.manager.getCache().cryptoAllocation = { ...settings };
    this.manager.queueSettingsSync();
  }
}

class CachedOptionsTradeRepository implements OptionsTradeRepository {
  constructor(private readonly manager: PersistenceManager) {}
  list() {
    return [...this.manager.getCache().optionsTrades];
  }
  getById(id: string) {
    return this.list().find((row) => row.id === id) ?? null;
  }
  append(trade: Parameters<OptionsTradeRepository["append"]>[0]) {
    this.manager.getCache().optionsTrades.push(trade);
    this.manager.queueOptionsTradesSync();
  }
  update(trade: Parameters<OptionsTradeRepository["update"]>[0]) {
    const list = this.manager.getCache().optionsTrades;
    const idx = list.findIndex((row) => row.id === trade.id);
    if (idx >= 0) list[idx] = trade;
    this.manager.queueOptionsTradesSync();
  }
  remove(id: string) {
    this.manager.getCache().optionsTrades = this.manager
      .getCache()
      .optionsTrades.filter((row) => row.id !== id);
    this.manager.queueOptionsTradesSync();
  }
}

class CachedOptionsSettingsRepository implements OptionsSettingsRepository {
  constructor(private readonly manager: PersistenceManager) {}
  get() {
    return normalizeOptionsSettings(this.manager.getCache().optionsSettings);
  }
  save(settings: Parameters<OptionsSettingsRepository["save"]>[0]) {
    this.manager.getCache().optionsSettings = normalizeOptionsSettings(settings);
    this.manager.queueSettingsSync();
  }
}

export function createCachedRepositories(
  manager: PersistenceManager
): RepositoryBundle {
  return {
    contributions: new CachedContributionRepository(manager),
    goals: new CachedGoalRepository(manager),
    snapshots: new CachedSnapshotRepository(manager),
    dashboardSettings: new CachedDashboardSettingsRepository(manager),
    stockTransactions: new CachedStockTransactionRepository(manager),
    stockInstruments: new CachedStockInstrumentRepository(manager),
    stockPrices: new CachedStockPriceRepository(manager),
    stockPriceSchedule: new CachedStockPriceScheduleRepository(manager),
    stockDailyCandles: new CachedStockDailyCandleRepository(manager),
    stockWeeklyCandles: new CachedStockWeeklyCandleRepository(manager),
    scannerResults: new CachedScannerResultRepository(manager),
    scannerSchedule: new CachedScannerScheduleRepository(manager),
    scannerWatchlist: new CachedScannerWatchlistRepository(manager),
    cryptoHoldings: new CachedCryptoHoldingRepository(manager),
    cryptoAllocation: new CachedCryptoAllocationRepository(manager),
    optionsTrades: new CachedOptionsTradeRepository(manager),
    optionsSettings: new CachedOptionsSettingsRepository(manager),
  };
}
