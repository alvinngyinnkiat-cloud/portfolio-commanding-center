import { describe, expect, it } from "vitest";
import type { CalculatedHolding } from "@/core/domain/types";
import {
  buildDashboardStockSummary,
  deriveDashboardStockOutputs,
  deriveDashboardStockValues,
} from "./dashboard-stock-adapter";
import { summarizeStockHoldings } from "@/core/calculations/stocks/summary";
import { calculatePortfolioMetrics } from "@/core/calculations/portfolio";
import { emptyModuleContributionInputs } from "@/core/calculations/portfolio-test-helpers";

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

describe("deriveDashboardStockValues", () => {
  it("matches Module 2 US Holdings and SG Holdings summary cards", () => {
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
    const fxRate = 1.35;

    const dashboard = deriveDashboardStockValues(holdings, fxRate);
    const module2 = summarizeStockHoldings(holdings, fxRate);

    expect(dashboard.usStocksEtfSgd).toBe(module2.usMarketValueSgd);
    expect(dashboard.sgStocksSgd).toBe(module2.sgMarketValueSgd);
    expect(dashboard.usStocksEtfUsd).toBe(module2.usMarketValueUsd);
  });

  it("returns zero stock legs when there are no priced holdings", () => {
    const holdings: CalculatedHolding[] = [
      holding({
        market: "US",
        currentPrice: null,
        marketValue: 0,
        sgdValue: null,
      }),
    ];

    const dashboard = deriveDashboardStockValues(holdings, 1.35);

    expect(dashboard.usStocksEtfUsd).toBe(0);
    expect(dashboard.usStocksEtfSgd).toBe(0);
    expect(dashboard.sgStocksSgd).toBe(0);
  });

  it("feeds Dashboard metrics that match Module 2 US/SG Holdings cards", () => {
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
    const fxRate = 1.35;
    const stockValues = deriveDashboardStockValues(holdings, fxRate);
    const module2 = summarizeStockHoldings(holdings, fxRate);

    const metrics = calculatePortfolioMetrics({
      usStocksEtfUsd: stockValues.usStocksEtfUsd,
      sgStocksSgd: stockValues.sgStocksSgd,
      cryptoSgd: 0,
      cryptoHoldingCount: 0,
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
      clientPortfolioUsd: 0,
      clientPortfolioSgd: 0,
      fxRate,
      contributions: [],
      ...emptyModuleContributionInputs(),
    });

    expect(metrics.usStocksEtfSgd).toBe(module2.usMarketValueSgd);
    expect(metrics.sgStocksSgd).toBe(module2.sgMarketValueSgd);
  });

  it("feeds Dashboard stock contribution metrics from Module 2 ledger", () => {
    const holdings: CalculatedHolding[] = [];
    const transactions = [
      {
        id: "buy-1",
        date: "2025-01-01",
        market: "US" as const,
        ticker: "AAPL",
        assetName: "Apple",
        transactionType: "buy" as const,
        quantity: 10,
        price: 750,
        grossAmount: 7_500,
        fees: 0,
        netAmount: -7_500,
        currency: "USD" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "buy-2",
        date: "2025-01-02",
        market: "SG" as const,
        ticker: "D05",
        assetName: "DBS",
        transactionType: "buy" as const,
        quantity: 100,
        price: 40,
        grossAmount: 4_000,
        fees: 0,
        netAmount: -4_000,
        currency: "SGD" as const,
        createdAt: "2025-01-02T00:00:00.000Z",
      },
    ];
    const contributions = [
      {
        id: "c1",
        date: "2025-01-01",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 10_000,
        usdAllocationPercent: 75,
      },
      {
        id: "c2",
        date: "2025-01-02",
        type: "deposit" as const,
        category: "stock" as const,
        amountSgd: 4_000,
        usdAllocationPercent: 0,
      },
    ];
    const fxRate = 1.35;

    const module2 = buildDashboardStockSummary(
      holdings,
      contributions,
      transactions,
      fxRate
    );
    const stockOutputs = deriveDashboardStockOutputs(module2);
    const metrics = calculatePortfolioMetrics({
      usStocksEtfUsd: 0,
      sgStocksSgd: 0,
      cryptoSgd: 0,
      cryptoHoldingCount: 0,
      usdTradingCashUsd: 0,
      sgdTradingCashSgd: 0,
      cryptoCashSgd: 0,
      clientPortfolioUsd: 0,
      clientPortfolioSgd: 0,
      fxRate,
      contributions,
      totalStockContributionSgd: stockOutputs.stockContributionSgd,
      usStockContributionSgd: module2.usStockContributionSgd,
      sgStockContributionSgd: module2.sgStockContributionSgd,
      totalStockValueSgd: stockOutputs.totalStockValueSgd,
      stockHoldingsValueSgd: stockOutputs.stockHoldingsValueSgd,
      stockProfitLossSgd: stockOutputs.stockProfitLossSgd,
      stockAvailableTradingCashSgd: stockOutputs.availableTradingCashSgd,
      cryptoContributionSgd: 0,
      totalCryptoValueSgd: 0,
      cryptoHoldingsValueSgd: 0,
      cryptoProfitLossSgd: 0,
      cryptoAvailableTradingCashSgd: 0,
      personalCashContributionSgd: 0,
      optionsValueSgd: 0,
    });

    expect(metrics.usStockContributionSgd).toBe(module2.usStockContributionSgd);
    expect(metrics.sgStockContributionSgd).toBe(module2.sgStockContributionSgd);
    expect(metrics.totalStockContributionSgd).toBe(
      stockOutputs.stockContributionSgd
    );
    expect(stockOutputs.stockContributionSgd).toBe(14_000);
  });
});

describe("deriveDashboardStockOutputs", () => {
  it("exposes prepared capital-model outputs", () => {
    const summary = buildDashboardStockSummary(
      [holding({ market: "SG", marketValue: 5_000, sgdValue: 5_000 })],
      [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 8_000,
          usdAllocationPercent: 0,
        },
      ],
      [
        {
          id: "buy-1",
          date: "2025-01-01",
          market: "SG",
          ticker: "D05",
          assetName: "DBS",
          transactionType: "buy",
          quantity: 100,
          price: 40,
          grossAmount: 4_000,
          fees: 10,
          netAmount: -4_010,
          currency: "SGD",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ],
      1.35
    );

    const outputs = deriveDashboardStockOutputs(summary);

    expect(outputs.stockHoldingsValueSgd).toBe(5_000);
    expect(outputs.stockContributionSgd).toBe(8_000);
    expect(outputs.availableTradingCashSgd).toBe(3_990);
    expect(outputs.stockProfitLossSgd).toBe(990);
    expect(outputs.totalStockValueSgd).toBe(8_990);
  });
});
