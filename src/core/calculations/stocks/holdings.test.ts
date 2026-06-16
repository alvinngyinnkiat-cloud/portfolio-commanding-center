import { describe, expect, it } from "vitest";
import type { StockPrice, StockTransaction } from "@/core/domain/types";
import {
  applyTransactionToLedger,
  buildPositionLedgers,
  calculateAllPositionHoldings,
  calculateHoldings,
  calculatePositionLedger,
  createEmptyLedger,
  filterPositionsByMarket,
  splitOpenAndClosedPositions,
  summarizePositionOverview,
} from "./holdings";
import { SellExceedsHoldingsError } from "./errors";

function tx(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "transactionType">
): StockTransaction {
  const base: StockTransaction = {
    id: overrides.id ?? "tx-1",
    date: overrides.date ?? "2025-01-01",
    market: overrides.market ?? "US",
    ticker: overrides.ticker ?? "AAPL",
    assetName: overrides.assetName ?? "Apple Inc.",
    transactionType: overrides.transactionType,
    quantity: overrides.quantity ?? 0,
    price: overrides.price ?? 0,
    grossAmount: overrides.grossAmount ?? 0,
    fees: overrides.fees ?? 0,
    netAmount: overrides.netAmount ?? 0,
    currency: overrides.currency ?? "USD",
    createdAt: overrides.createdAt ?? "2025-01-01T00:00:00.000Z",
    notes: overrides.notes,
  };
  return { ...base, ...overrides };
}

function price(
  market: StockPrice["market"],
  ticker: string,
  latestPrice: number
): StockPrice {
  return {
    market,
    ticker,
    latestPrice,
    currentPrice: latestPrice,
    lastPriceUpdate: "2025-06-01T00:00:00.000Z",
    priceAsOf: "2025-06-01",
    source: "yahoo",
  };
}

describe("stock holdings engine", () => {
  it("1. buy increases quantity and cost", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 5,
        netAmount: -1505,
      }),
    ];

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    expect(ledger).not.toBeNull();
    expect(ledger!.quantity).toBe(10);
    expect(ledger!.totalCost).toBe(1505);
    expect(ledger!.totalCost / ledger!.quantity).toBe(150.5);
  });

  it("2. sell reduces quantity", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 5,
        netAmount: -1505,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 3,
        price: 170,
        grossAmount: 510,
        fees: 2,
        netAmount: 508,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    expect(ledger!.quantity).toBe(7);
  });

  it("3. sell calculates realised P/L correctly", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 5,
        netAmount: -1505,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 5,
        price: 180,
        grossAmount: 900,
        fees: 3,
        netAmount: 897,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    // avg cost 150.50 → cost of 5 sold = 752.50 → realised = 897 - 752.50 = 144.50
    expect(ledger!.realisedPL).toBeCloseTo(144.5, 2);
  });

  it("4. partial sell preserves correct remaining average cost", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 5,
        netAmount: -1505,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 5,
        price: 180,
        grossAmount: 900,
        fees: 3,
        netAmount: 897,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    expect(ledger!.quantity).toBe(5);
    expect(ledger!.totalCost).toBeCloseTo(752.5, 2);
    expect(ledger!.totalCost / ledger!.quantity).toBeCloseTo(150.5, 2);
  });

  it("5. dividend does not change quantity", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 5,
        netAmount: -1505,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "div-1",
        date: "2025-03-01",
        transactionType: "dividend",
        quantity: 0,
        price: 0,
        grossAmount: 25,
        fees: 0,
        netAmount: 25,
        createdAt: "2025-03-01T00:00:00.000Z",
      }),
    ];

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    expect(ledger!.quantity).toBe(10);
    expect(ledger!.totalCost).toBe(1505);
    expect(ledger!.dividendIncome).toBe(25);
  });

  it("6. fee affects cost basis", () => {
    let ledger = createEmptyLedger("US", "AAPL", "Apple Inc.");
    ledger = applyTransactionToLedger(
      ledger,
      tx({
        transactionType: "buy",
        quantity: 10,
        price: 100,
        grossAmount: 1000,
        fees: 0,
        netAmount: -1000,
      })
    );
    ledger = applyTransactionToLedger(
      ledger,
      tx({
        id: "fee-1",
        date: "2025-02-01",
        transactionType: "fee",
        quantity: 0,
        price: 0,
        grossAmount: 0,
        fees: 10,
        netAmount: -10,
        createdAt: "2025-02-01T00:00:00.000Z",
      })
    );

    expect(ledger.totalCost).toBe(1010);
    expect(ledger.quantity).toBe(10);
    expect(ledger.totalCost / ledger.quantity).toBe(101);
  });

  it("7. US holding converts to SGD using app-wide FX", () => {
    const transactions = [
      tx({
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 0,
        netAmount: -1500,
      }),
    ];
    const holdings = calculateHoldings(
      transactions,
      [price("US", "AAPL", 160)],
      1.35
    );

    expect(holdings).toHaveLength(1);
    expect(holdings[0].marketValue).toBe(1600);
    expect(holdings[0].sgdValue).toBeCloseTo(2160, 2);
  });

  it("8. SG holding remains SGD", () => {
    const transactions = [
      tx({
        market: "SG",
        ticker: "D05",
        assetName: "DBS Group",
        currency: "SGD",
        transactionType: "buy",
        quantity: 100,
        price: 35,
        grossAmount: 3500,
        fees: 0,
        netAmount: -3500,
      }),
    ];
    const holdings = calculateHoldings(
      transactions,
      [price("SG", "D05", 36)],
      1.35
    );

    expect(holdings).toHaveLength(1);
    expect(holdings[0].marketValue).toBe(3600);
    expect(holdings[0].sgdValue).toBe(3600);
    expect(holdings[0].currency).toBe("SGD");
  });

  it("9. cannot sell more shares than owned", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 5,
        price: 150,
        grossAmount: 750,
        fees: 0,
        netAmount: -750,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 6,
        price: 180,
        grossAmount: 1080,
        fees: 0,
        netAmount: 1080,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    expect(() => buildPositionLedgers(transactions)).toThrow(
      SellExceedsHoldingsError
    );
  });

  it("10. holdings are derived from transactions, not manual current values", () => {
    const transactions = [
      tx({
        transactionType: "buy",
        quantity: 10,
        price: 150,
        grossAmount: 1500,
        fees: 0,
        netAmount: -1500,
      }),
    ];

    const ledgerBefore = calculatePositionLedger(transactions, "US", "AAPL");
    const holdingsLowPrice = calculateHoldings(
      transactions,
      [price("US", "AAPL", 100)],
      1.35
    );
    const holdingsHighPrice = calculateHoldings(
      transactions,
      [price("US", "AAPL", 200)],
      1.35
    );

    expect(ledgerBefore!.quantity).toBe(10);
    expect(ledgerBefore!.totalCost).toBe(1500);
    expect(holdingsLowPrice[0].quantity).toBe(10);
    expect(holdingsHighPrice[0].quantity).toBe(10);
    expect(holdingsLowPrice[0].totalCost).toBe(1500);
    expect(holdingsHighPrice[0].totalCost).toBe(1500);
    expect(holdingsLowPrice[0].marketValue).toBe(1000);
    expect(holdingsHighPrice[0].marketValue).toBe(2000);
    expect(holdingsLowPrice[0].unrealisedPL).toBe(-500);
    expect(holdingsHighPrice[0].unrealisedPL).toBe(500);
  });

  it("returns null sgdValue for US holdings when FX is invalid", () => {
    const transactions = [
      tx({
        transactionType: "buy",
        quantity: 1,
        price: 100,
        grossAmount: 100,
        fees: 0,
        netAmount: -100,
      }),
    ];
    const holdings = calculateHoldings(
      transactions,
      [price("US", "AAPL", 110)],
      null
    );

    expect(holdings[0].sgdValue).toBeNull();
    expect(holdings[0].marketValue).toBe(110);
  });

  it("excludes closed positions from calculateHoldings output", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 5,
        price: 100,
        grossAmount: 500,
        fees: 0,
        netAmount: -500,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 5,
        price: 120,
        grossAmount: 600,
        fees: 0,
        netAmount: 600,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    const holdings = calculateHoldings(transactions, [price("US", "AAPL", 120)], 1.35);
    expect(holdings).toHaveLength(0);

    const ledger = calculatePositionLedger(transactions, "US", "AAPL");
    expect(ledger!.quantity).toBe(0);
    expect(ledger!.realisedPL).toBe(100);
  });

  it("includes closed positions in calculateAllPositionHoldings", () => {
    const transactions = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        quantity: 5,
        price: 100,
        grossAmount: 500,
        fees: 0,
        netAmount: -500,
        createdAt: "2025-01-01T00:00:00.000Z",
      }),
      tx({
        id: "sell-1",
        date: "2025-02-01",
        transactionType: "sell",
        quantity: 5,
        price: 120,
        grossAmount: 600,
        fees: 0,
        netAmount: 600,
        createdAt: "2025-02-01T00:00:00.000Z",
      }),
    ];

    const positions = calculateAllPositionHoldings(
      transactions,
      [price("US", "AAPL", 120)],
      1.35
    );

    expect(positions).toHaveLength(1);
    expect(positions[0]?.quantity).toBe(0);
    expect(positions[0]?.realisedPL).toBe(100);
  });
});

describe("position display filters", () => {
  const openHolding = {
    market: "US" as const,
    ticker: "NVDA",
    assetName: "NVIDIA",
    currency: "USD" as const,
    quantity: 10,
    averageCost: 100,
    totalCost: 1000,
    currentPrice: null,
    marketValue: 0,
    unrealisedPL: 0,
    realisedPL: 0,
    dividendIncome: 0,
    sgdValue: null,
  };
  const closedHolding = {
    ...openHolding,
    ticker: "AAPL",
    quantity: 0,
    totalCost: 0,
    realisedPL: 120,
    dividendIncome: 5,
  };

  it("splits open and closed positions by quantity", () => {
    const { open, closed } = splitOpenAndClosedPositions([
      openHolding,
      closedHolding,
    ]);
    expect(open).toHaveLength(1);
    expect(open[0]?.ticker).toBe("NVDA");
    expect(closed).toHaveLength(1);
    expect(closed[0]?.ticker).toBe("AAPL");
  });

  it("filters by market and currency fallback", () => {
    const usByCurrency = { ...openHolding, market: "US" as const, currency: "USD" as const };
    const sgHolding = {
      ...openHolding,
      market: "SG" as const,
      ticker: "D05",
      currency: "SGD" as const,
    };

    expect(filterPositionsByMarket([usByCurrency, sgHolding], "ALL")).toHaveLength(2);
    expect(filterPositionsByMarket([usByCurrency, sgHolding], "US")).toHaveLength(1);
    expect(filterPositionsByMarket([usByCurrency, sgHolding], "SG")).toHaveLength(1);
  });

  it("includes positions without current price in open list", () => {
    const { open } = splitOpenAndClosedPositions([openHolding]);
    expect(open[0]?.currentPrice).toBeNull();
    expect(open[0]?.quantity).toBe(10);
  });
});

describe("summarizePositionOverview", () => {
  it("aggregates open and closed position metrics", () => {
    const positions = [
      {
        market: "US" as const,
        ticker: "AAPL",
        assetName: "Apple",
        currency: "USD" as const,
        quantity: 2,
        averageCost: 100,
        totalCost: 200,
        currentPrice: 110,
        marketValue: 220,
        unrealisedPL: 20,
        realisedPL: 50,
        dividendIncome: 10,
        sgdValue: 297,
      },
      {
        market: "SG" as const,
        ticker: "D05",
        assetName: "DBS",
        currency: "SGD" as const,
        quantity: 0,
        averageCost: 0,
        totalCost: 0,
        currentPrice: null,
        marketValue: 0,
        unrealisedPL: 0,
        realisedPL: 120,
        dividendIncome: 30,
        sgdValue: 0,
      },
    ];

    const summary = summarizePositionOverview(positions, 1.35);

    expect(summary.openPositionCount).toBe(1);
    expect(summary.closedPositionCount).toBe(1);
    expect(summary.openMarketValueUsd).toBe(220);
    expect(summary.openMarketValueSgd).toBe(297);
    expect(summary.closedRealisedPLUsd).toBe(0);
    expect(summary.closedRealisedPLSgdMarket).toBe(120);
    expect(summary.closedRealisedPLSgd).toBe(120);
    expect(summary.totalDividendsUsd).toBe(10);
    expect(summary.totalDividendsSgdMarket).toBe(30);
    expect(summary.totalDividendsSgd).toBeCloseTo(43.5, 2);
  });
});
