import { describe, expect, it } from "vitest";
import type {
  StockPrice,
  StockPriceScheduleState,
  StockTransaction,
} from "@/core/domain/types";
import type { StockPriceRepository } from "@/core/database/repositories/stock-price-repository";
import type { StockTransactionRepository } from "@/core/database/repositories/stock-transaction-repository";
import type { StockPriceScheduleRepository } from "@/core/database/repositories/stock-price-schedule-repository";
import type { ScannerWatchlistRepository } from "@/core/database/repositories/scanner-watchlist-repository";
import type { WatchlistEntry } from "@/core/calculations/scanner/watchlist";
import { StockPriceUpdateService } from "./stock-price-update-service";
import { calculateHoldings } from "@/core/calculations/stocks/holdings";
import { deriveDashboardStockValues } from "@/core/adapters/dashboard-stock-adapter";
import { calculatePortfolioMetrics } from "@/core/calculations/portfolio";
import { emptyModuleContributionInputs } from "@/core/calculations/portfolio-test-helpers";
import type { StockQuoteResult } from "./yahoo-finance-provider";

class MemoryTransactionRepo implements StockTransactionRepository {
  constructor(private rows: StockTransaction[] = []) {}

  list() {
    return [...this.rows];
  }

  upsert(row: StockTransaction) {
    const idx = this.rows.findIndex((item) => item.id === row.id);
    if (idx >= 0) this.rows[idx] = row;
    else this.rows.push(row);
  }

  delete() {}
  replaceAll(rows: StockTransaction[]) {
    this.rows = [...rows];
  }
}

class MemoryPriceRepo implements StockPriceRepository {
  constructor(private rows: StockPrice[] = []) {}

  list() {
    return [...this.rows];
  }

  upsert(row: StockPrice) {
    const idx = this.rows.findIndex(
      (item) => item.market === row.market && item.ticker === row.ticker
    );
    if (idx >= 0) this.rows[idx] = row;
    else this.rows.push(row);
  }

  delete() {}
  replaceAll(rows: StockPrice[]) {
    this.rows = [...rows];
  }
}

class MemoryScheduleRepo implements StockPriceScheduleRepository {
  constructor(private state: StockPriceScheduleState = {
    usLastUpdateDate: null,
    sgLastUpdateDate: null,
  }) {}

  get() {
    return { ...this.state };
  }

  set(state: StockPriceScheduleState) {
    this.state = { ...state };
  }
}

class MemoryWatchlistRepo implements ScannerWatchlistRepository {
  constructor(private entries: WatchlistEntry[] = []) {}

  get() {
    return [...this.entries];
  }

  set(entries: WatchlistEntry[]) {
    this.entries = [...entries];
  }

  reset() {
    this.entries = [];
  }
}

function buy(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "market" | "ticker">
): StockTransaction {
  return {
    id: `${overrides.market}-${overrides.ticker}`,
    date: "2025-01-01",
    assetName: overrides.ticker ?? "Test",
    transactionType: "buy",
    quantity: 10,
    price: 100,
    grossAmount: 1000,
    fees: 0,
    netAmount: -1000,
    currency: overrides.market === "US" ? "USD" : "SGD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("StockPriceUpdateService", () => {
  const usUpdateTime = new Date("2026-06-12T22:00:00.000Z");
  const sgUpdateTime = new Date("2026-06-13T10:00:00.000Z");

  it("3. updates market value and 4. unrealised P/L when price changes", async () => {
    const transactions = new MemoryTransactionRepo([
      buy({ market: "US", ticker: "AAPL", assetName: "Apple" }),
    ]);
    const prices = new MemoryPriceRepo();
    const schedule = new MemoryScheduleRepo();
    const fetchQuotes = async (): Promise<StockQuoteResult[]> => [
      { market: "US", ticker: "AAPL", price: 150 },
    ];

    const service = new StockPriceUpdateService(
      transactions,
      prices,
      schedule,
      new MemoryWatchlistRepo(),
      fetchQuotes
    );

    await service.updateMarketPrices("US", usUpdateTime);

    const before = calculateHoldings(transactions.list(), [], 1.35)[0];
    const after = calculateHoldings(transactions.list(), prices.list(), 1.35)[0];

    expect(before.marketValue).toBe(0);
    expect(after.marketValue).toBe(1500);
    expect(after.unrealisedPL).toBe(500);
  });

  it("6. holdings quantity and 7. cost basis and 8. realised P/L remain unchanged", async () => {
    const transactions = new MemoryTransactionRepo([
      buy({ market: "SG", ticker: "D05", assetName: "DBS" }),
      {
        ...buy({ market: "SG", ticker: "D05", assetName: "DBS" }),
        id: "sell-1",
        transactionType: "sell",
        quantity: 2,
        price: 120,
        grossAmount: 240,
        netAmount: 240,
        date: "2025-02-01",
        createdAt: "2025-02-01T00:00:00.000Z",
      },
    ]);
    const prices = new MemoryPriceRepo();
    const schedule = new MemoryScheduleRepo();
    const service = new StockPriceUpdateService(
      transactions,
      prices,
      schedule,
      new MemoryWatchlistRepo(),
      async () => [{ market: "SG", ticker: "D05", price: 130 }]
    );

    const before = calculateHoldings(transactions.list(), [], null)[0];
    await service.updateMarketPrices("SG", sgUpdateTime);
    const after = calculateHoldings(transactions.list(), prices.list(), null)[0];

    expect(after.quantity).toBe(before.quantity);
    expect(after.totalCost).toBe(before.totalCost);
    expect(after.averageCost).toBe(before.averageCost);
    expect(after.realisedPL).toBe(before.realisedPL);
  });

  it("5. dashboard stock values update from new prices", async () => {
    const transactions = new MemoryTransactionRepo([
      buy({ market: "US", ticker: "AAPL", assetName: "Apple" }),
      buy({ market: "SG", ticker: "D05", assetName: "DBS" }),
    ]);
    const prices = new MemoryPriceRepo();
    const schedule = new MemoryScheduleRepo();
    const service = new StockPriceUpdateService(
      transactions,
      prices,
      schedule,
      new MemoryWatchlistRepo(),
      async (symbols) =>
        symbols.map((symbol) => ({
          market: symbol.market,
          ticker: symbol.ticker,
          price: symbol.market === "US" ? 200 : 40,
        }))
    );

    await service.updateMarketPrices("US", usUpdateTime);
    await service.updateMarketPrices("SG", sgUpdateTime);

    const holdings = calculateHoldings(transactions.list(), prices.list(), 1.35);
    const dashboard = deriveDashboardStockValues(holdings, 1.35);
    const metrics = calculatePortfolioMetrics({
      usStocksEtfUsd: dashboard.usStocksEtfUsd,
      sgStocksSgd: dashboard.sgStocksSgd,
      cryptoSgd: 0,
      cryptoHoldingCount: 0,
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
      clientPortfolioUsd: 0,
      clientPortfolioSgd: 0,
      fxRate: 1.35,
      contributions: [],
      ...emptyModuleContributionInputs(),
    });

    expect(metrics.usStocksEtfSgd).toBe(2700);
    expect(metrics.sgStocksSgd).toBe(400);
  });

  it("9. retains previous price and marks unavailable when fetch fails", async () => {
    const transactions = new MemoryTransactionRepo([
      buy({ market: "US", ticker: "AAPL", assetName: "Apple" }),
    ]);
    const prices = new MemoryPriceRepo([
      {
        market: "US",
        ticker: "AAPL",
        latestPrice: 180,
        currentPrice: 180,
        lastPriceUpdate: "2026-06-11T22:00:00.000Z",
        priceAsOf: "2026-06-12",
        source: "yahoo",
      },
    ]);
    const schedule = new MemoryScheduleRepo();
    const service = new StockPriceUpdateService(
      transactions,
      prices,
      schedule,
      new MemoryWatchlistRepo(),
      async () => [
        { market: "US", ticker: "AAPL", price: null, error: "network" },
      ]
    );

    await service.updateMarketPrices("US", usUpdateTime);

    const stored = prices.list()[0];
    const holding = calculateHoldings(transactions.list(), prices.list(), 1.35)[0];

    expect(stored.latestPrice).toBe(180);
    expect(stored.priceUnavailable).toBe(true);
    expect(holding.marketValue).toBe(1800);
    expect(holding.unrealisedPL).toBe(800);
  });

  it("10. only runs once per market per SGT day when due", async () => {
    const transactions = new MemoryTransactionRepo([
      buy({ market: "US", ticker: "AAPL", assetName: "Apple" }),
    ]);
    const prices = new MemoryPriceRepo();
    const schedule = new MemoryScheduleRepo();
    let fetchCount = 0;
    const service = new StockPriceUpdateService(
      transactions,
      prices,
      schedule,
      new MemoryWatchlistRepo(),
      async () => {
        fetchCount += 1;
        return [{ market: "US", ticker: "AAPL", price: 150 }];
      }
    );

    const first = await service.updateMarketPricesIfDue("US", usUpdateTime);
    const second = await service.updateMarketPricesIfDue("US", usUpdateTime);

    expect(first.updated).toBe(true);
    expect(second.updated).toBe(false);
    expect(fetchCount).toBe(1);
  });
});
