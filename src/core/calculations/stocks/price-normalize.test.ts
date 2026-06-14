import { describe, expect, it } from "vitest";
import type { StockPrice, StockTransaction } from "@/core/domain/types";
import {
  normalizeStockPrices,
  resolveEffectivePrice,
  resolvePriceSource,
} from "./price-normalize";
import { calculateHoldings } from "./holdings";
import { summarizeStockHoldings } from "./summary";
import { deriveDashboardStockValues } from "@/core/adapters/dashboard-stock-adapter";

function buy(
  overrides: Partial<StockTransaction> & Pick<StockTransaction, "market" | "ticker">
): StockTransaction {
  return {
    id: `${overrides.market}-${overrides.ticker}`,
    date: "2025-01-01",
    assetName: overrides.ticker ?? "Test",
    transactionType: "buy",
    quantity: 100,
    price: 100,
    grossAmount: 10_000,
    fees: 0,
    netAmount: -10_000,
    currency: overrides.market === "US" ? "USD" : "SGD",
    createdAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("price resolution fallback", () => {
  it("acceptance: manual NVDA US$180 × 100 at FX 1.35", () => {
    const transactions = [buy({ market: "US", ticker: "NVDA", assetName: "NVIDIA" })];
    const prices = normalizeStockPrices([
      {
        market: "US",
        ticker: "NVDA",
        latestPrice: 0,
        manualPrice: 180,
        lastPriceUpdate: "2026-06-01T00:00:00.000Z",
        priceAsOf: "2026-06-01",
        source: "yahoo",
      },
    ]);
    const fxRate = 1.35;

    expect(resolvePriceSource(prices[0])).toBe("Manual");
    expect(resolveEffectivePrice(prices[0])).toBe(180);

    const holdings = calculateHoldings(transactions, prices, fxRate);
    const holding = holdings[0];

    expect(holding.marketValue).toBe(18_000);
    expect(holding.sgdValue).toBe(24_300);
    expect(holding.totalCost).toBe(10_000);
    expect(holding.realisedPL).toBe(0);

    const summary = summarizeStockHoldings(holdings, fxRate);
    expect(summary.usMarketValueSgd).toBe(24_300);
    expect(summary.totalStockHoldingsSgd).toBe(24_300);

    const dashboard = deriveDashboardStockValues(holdings, fxRate);
    expect(dashboard.usStocksEtfSgd).toBe(24_300);
  });

  it("acceptance: auto price US$185 overrides manual US$180", () => {
    const prices = normalizeStockPrices([
      {
        market: "US",
        ticker: "NVDA",
        latestPrice: 185,
        manualPrice: 180,
        lastPriceUpdate: "2026-06-13T06:00:00.000Z",
        priceAsOf: "2026-06-13",
        source: "yahoo",
      },
    ]);
    const transactions = [buy({ market: "US", ticker: "NVDA", assetName: "NVIDIA" })];
    const fxRate = 1.35;

    expect(resolvePriceSource(prices[0])).toBe("Auto");
    expect(resolveEffectivePrice(prices[0])).toBe(185);

    const holdings = calculateHoldings(transactions, prices, fxRate);
    expect(holdings[0].marketValue).toBe(18_500);
    expect(holdings[0].sgdValue).toBe(24_975);

    const summary = summarizeStockHoldings(holdings, fxRate);
    expect(summary.usMarketValueSgd).toBe(24_975);
  });

  it("returns Missing when neither auto nor manual price exists", () => {
    const price: StockPrice = {
      market: "US",
      ticker: "NVDA",
      latestPrice: 0,
      lastPriceUpdate: "2026-06-01T00:00:00.000Z",
      priceAsOf: "2026-06-01",
      source: "yahoo",
    };

    expect(resolvePriceSource(price)).toBe("Missing");
    expect(resolveEffectivePrice(price)).toBeNull();

    const holdings = calculateHoldings(
      [buy({ market: "US", ticker: "NVDA", assetName: "NVIDIA" })],
      normalizeStockPrices([price]),
      1.35
    );

    expect(holdings[0].currentPrice).toBeNull();
    expect(holdings[0].marketValue).toBe(0);
    expect(holdings[0].unrealisedPL).toBe(0);
  });

  it("prefers auto latestPrice over manualPrice", () => {
    const effective = resolveEffectivePrice({
      market: "US",
      ticker: "AAPL",
      latestPrice: 200,
      manualPrice: 150,
      lastPriceUpdate: "2026-06-01T00:00:00.000Z",
      priceAsOf: "2026-06-01",
      source: "yahoo",
    });

    expect(effective).toBe(200);
    expect(
      resolvePriceSource({
        market: "US",
        ticker: "AAPL",
        latestPrice: 200,
        manualPrice: 150,
        lastPriceUpdate: "2026-06-01T00:00:00.000Z",
        priceAsOf: "2026-06-01",
        source: "yahoo",
      })
    ).toBe("Auto");
  });
});
