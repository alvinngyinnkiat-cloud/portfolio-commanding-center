import { createLocalRepositories } from "@/core/database/local";
import { FxService } from "./fx-service";
import { DashboardSettingsService } from "./dashboard-settings-service";
import { ContributionService } from "./contribution-service";
import { GoalService } from "./goal-service";
import { PortfolioAggregator } from "./portfolio-aggregator";
import { SnapshotService } from "./snapshot-service";
import { StockTransactionService } from "./stock-transaction-service";
import { StockTrackerService } from "./stock-tracker-service";
import { StockPriceUpdateService } from "./stock-price-update-service";
import { createBrowserStockQuoteFetcher } from "./stock-price-fetcher";
import { CryptoHoldingService } from "./crypto-holding-service";
import { CryptoAllocationService } from "./crypto-allocation-service";
import { CryptoTrackerService } from "./crypto-tracker-service";
import { StockCandleUpdateService } from "./stock-candle-update-service";
import { createBrowserStockHistoryFetcher } from "./stock-history-fetcher";
import { createStockMarketDataReader } from "./stock-market-data-reader";
import { ScannerService } from "./scanner-service";
import { ScannerWatchlistService } from "./scanner-watchlist-service";
import { runScannerManualRefresh } from "./scanner-refresh-service";
import { OptionsTradeService } from "./options-trade-service";
import { OptionsSettingsService } from "./options-settings-service";
import { OptionsTrackerService } from "./options-tracker-service";

export function createPortfolioServices() {
  const repos = createLocalRepositories();

  const stockTracker = new StockTrackerService(
    repos.stockTransactions,
    repos.stockPrices,
    repos.dashboardSettings
  );

  const stockPriceUpdates = new StockPriceUpdateService(
    repos.stockTransactions,
    repos.stockPrices,
    repos.stockPriceSchedule,
    repos.scannerWatchlist,
    createBrowserStockQuoteFetcher()
  );

  const stockCandleUpdates = new StockCandleUpdateService(
    repos.stockTransactions,
    repos.stockDailyCandles,
    repos.stockWeeklyCandles,
    repos.stockPriceSchedule,
    repos.scannerWatchlist,
    createBrowserStockHistoryFetcher()
  );

  const marketDataReader = createStockMarketDataReader(
    repos.stockPrices,
    repos.stockDailyCandles,
    repos.stockWeeklyCandles
  );

  const scannerWatchlist = new ScannerWatchlistService(repos.scannerWatchlist);

  const scanner = new ScannerService(
    marketDataReader,
    repos.scannerResults,
    repos.scannerSchedule,
    repos.stockPriceSchedule,
    repos.scannerWatchlist
  );

  const cryptoTracker = new CryptoTrackerService(
    repos.cryptoHoldings,
    repos.cryptoAllocation,
    repos.contributions
  );

  const optionsTracker = new OptionsTrackerService(
    repos.optionsTrades,
    repos.optionsSettings,
    repos.contributions,
    repos.stockTransactions,
    repos.dashboardSettings,
    repos.scannerWatchlist,
    repos.stockPrices,
    repos.stockDailyCandles,
    repos.scannerResults
  );

  const aggregator = new PortfolioAggregator(
    repos.dashboardSettings,
    repos.contributions,
    repos.goals,
    repos.snapshots,
    stockTracker,
    cryptoTracker,
    repos.optionsTrades,
    repos.optionsSettings
  );

  return {
    aggregator,
    fx: new FxService(repos.dashboardSettings),
    dashboardSettings: new DashboardSettingsService(repos.dashboardSettings),
    contributions: new ContributionService(repos.contributions),
    goals: new GoalService(repos.goals),
    snapshots: new SnapshotService(repos.snapshots, aggregator),
    stockTransactions: new StockTransactionService(
      repos.stockTransactions,
      repos.stockInstruments
    ),
    stockTracker,
    stockPriceUpdates,
    stockCandleUpdates,
    scannerWatchlist,
    scanner,
    cryptoHoldings: new CryptoHoldingService(repos.cryptoHoldings),
    cryptoAllocation: new CryptoAllocationService(repos.cryptoAllocation),
    cryptoTracker,
    optionsTrades: new OptionsTradeService(
      repos.optionsTrades,
      repos.optionsSettings
    ),
    optionsSettings: new OptionsSettingsService(repos.optionsSettings),
    optionsTracker,
    refreshScannerNow: async (date: Date = new Date()) =>
      runScannerManualRefresh(
        (refreshDate) => stockCandleUpdates.updateUsCandles(refreshDate),
        (refreshDate) => scanner.runScan(refreshDate),
        date
      ),
  };
}

export type PortfolioServices = ReturnType<typeof createPortfolioServices>;
