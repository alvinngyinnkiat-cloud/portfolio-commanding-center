import { describe, expect, it } from "vitest";
import type { CalculatedHolding, StockTransaction } from "@/core/domain/types";
import {
  buildStockPortfolioSummary,
  buildStockTrackerSummary,
  summarizeStockHoldings,
} from "./summary";

function holding(
  overrides: Partial<CalculatedHolding> & Pick<CalculatedHolding, "market">
): CalculatedHolding {
  const market = overrides.market;
  return {
    ticker: "TEST",
    assetName: "Test",
    currency: market === "US" ? "USD" : "SGD",
    quantity: 1,
    averageCost: 0,
    totalCost: 0,
    currentPrice: 1,
    marketValue: 0,
    unrealisedPL: 0,
    realisedPL: 0,
    dividendIncome: 0,
    sgdValue: null,
    ...overrides,
  };
}

function tx(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "transactionType">
): StockTransaction {
  return {
    id: "tx-1",
    date: "2025-01-01",
    market: "US",
    ticker: "NVDA",
    assetName: "NVIDIA",
    transactionType: overrides.transactionType,
    quantity: overrides.quantity ?? 0,
    price: overrides.price ?? 0,
    grossAmount: overrides.grossAmount ?? 0,
    fees: overrides.fees ?? 0,
    netAmount: overrides.netAmount ?? 0,
    currency: "USD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("summarizeStockHoldings", () => {
  it("acceptance: US 10k USD at FX 1.35 + SG 5k SGD = 18.5k SGD total", () => {
    const holdings: CalculatedHolding[] = [
      holding({
        market: "US",
        ticker: "AAPL",
        marketValue: 10_000,
        sgdValue: 13_500,
      }),
      holding({
        market: "SG",
        ticker: "D05",
        marketValue: 5_000,
        sgdValue: 5_000,
      }),
    ];

    const summary = summarizeStockHoldings(holdings, 1.35);

    expect(summary.usMarketValueUsd).toBe(10_000);
    expect(summary.usMarketValueSgd).toBe(13_500);
    expect(summary.sgMarketValueSgd).toBe(5_000);
    expect(summary.totalStockHoldingsSgd).toBe(18_500);
  });

  it("derives US SGD from USD total × FX even when per-holding sgdValue is null", () => {
    const holdings: CalculatedHolding[] = [
      holding({
        market: "US",
        ticker: "AAPL",
        marketValue: 10_000,
        sgdValue: null,
      }),
    ];

    const summary = summarizeStockHoldings(holdings, 1.35);

    expect(summary.usMarketValueSgd).toBe(13_500);
    expect(summary.totalStockHoldingsSgd).toBe(13_500);
  });

  it("excludes holdings without a current price from market value totals", () => {
    const holdings: CalculatedHolding[] = [
      holding({
        market: "US",
        ticker: "AAPL",
        currentPrice: null,
        marketValue: 0,
        sgdValue: null,
      }),
      holding({
        market: "SG",
        ticker: "D05",
        marketValue: 5_000,
        sgdValue: 5_000,
      }),
    ];

    const summary = summarizeStockHoldings(holdings, 1.35);

    expect(summary.usMarketValueUsd).toBe(0);
    expect(summary.usMarketValueSgd).toBe(0);
    expect(summary.totalStockHoldingsSgd).toBe(5_000);
  });
});

describe("buildStockPortfolioSummary", () => {
  it("acceptance: total value and P/L use deposit contribution and total value", () => {
    const holdings: CalculatedHolding[] = [
      holding({ market: "US", marketValue: 10_259.5, sgdValue: 13_850.33 }),
    ];
    const transactions: StockTransaction[] = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        grossAmount: 10_000,
        netAmount: -10_000,
      }),
      tx({
        id: "div-1",
        transactionType: "dividend",
        grossAmount: 100,
        netAmount: 100,
      }),
    ];
    const contributions = [
      {
        id: "c1",
        date: "2025-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 24_300,
        usdAllocationPercent: 100,
      },
    ];

    const full = buildStockPortfolioSummary(
      holdings,
      contributions,
      transactions,
      1.35
    );

    expect(full.usStockContributionUsd).toBeCloseTo(18_000, 2);
    expect(full.usStockContributionSgd).toBe(24_300);
    expect(full.usAvailableTradingCashUsd).toBe(8_100);
    expect(full.usTotalValueUsd).toBeCloseTo(18_359.5, 2);
    expect(full.usMarketPLUsd).toBeCloseTo(359.5, 2);
    expect(full.usMarketPLSgd).toBeCloseTo(485.33, 2);

    expect(full.usTotalValueUsd).toBeCloseTo(
      full.usMarketValueUsd + full.usAvailableTradingCashUsd,
      2
    );
    expect(full.allMarketPLSgd).toBeCloseTo(
      full.allMarketTotalValueSgd - full.totalStockContributionSgd,
      2
    );
  });

  it("P/L equals total value minus deposit contribution when no holdings", () => {
    const holdings: CalculatedHolding[] = [
      holding({ market: "US", marketValue: 10_000 }),
      holding({ market: "SG", marketValue: 5_000 }),
    ];

    const full = buildStockPortfolioSummary(
      holdings,
      [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 10_800,
          usdAllocationPercent: 100,
        },
        {
          id: "c2",
          date: "2025-01-02",
          type: "deposit",
          category: "stock",
          amountSgd: 4_000,
          usdAllocationPercent: 0,
        },
      ],
      [],
      1.35
    );

    expect(full.totalStockContributionSgd).toBe(14_800);
    expect(full.allMarketTotalValueSgd).toBe(33_300);
    expect(full.usMarketPLSgd).toBeCloseTo(13_500, 2);
    expect(full.sgMarketPLSgd).toBe(5_000);
    expect(full.allMarketPLSgd).toBeCloseTo(18_500, 2);

    expect(full.usTotalValueUsd).toBeCloseTo(
      full.usMarketValueUsd + full.usAvailableTradingCashUsd,
      2
    );
    expect(full.sgTotalValueSgd).toBeCloseTo(
      full.sgMarketValueSgd + full.sgAvailableTradingCashSgd,
      2
    );
    expect(full.allMarketPLSgd).toBeCloseTo(
      full.allMarketTotalValueSgd - full.totalStockContributionSgd,
      2
    );
  });
});

describe("buildStockTrackerSummary", () => {
  it("maps capital model fields for dashboard adapter", () => {
    const holdings: CalculatedHolding[] = [
      holding({ market: "US", marketValue: 10_000, sgdValue: 13_500 }),
    ];
    const transactions: StockTransaction[] = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        grossAmount: 8_000,
        fees: 20,
        netAmount: -8_020,
      }),
    ];
    const contributions = [
      {
        id: "c1",
        date: "2025-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 13_500,
        usdAllocationPercent: 100,
      },
    ];

    const summary = buildStockTrackerSummary(
      holdings,
      contributions,
      transactions,
      1.35
    );

    expect(summary.stockHoldingsValueSgd).toBe(13_500);
    expect(summary.stockContributionSgd).toBe(13_500);
    expect(summary.availableTradingCashSgd).toBeCloseTo(2_673, 0);
    expect(summary.stockProfitLossSgd).toBeCloseTo(2_673, 0);
    expect(summary.totalStockValueSgd).toBeCloseTo(16_173, 0);
  });
});
