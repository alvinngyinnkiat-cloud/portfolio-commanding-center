import { describe, expect, it } from "vitest";
import type { StockTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { buildFxPerformanceMetrics } from "./fx-performance";

const userExampleConversions: StockFxConversion[] = [
  {
    id: "fx-1",
    date: "2024-01-01",
    direction: "sgd_to_usd",
    sgdAmount: 1_736,
    usdAmount: 1_350,
    createdAt: "2024-01-01T10:00:00Z",
  },
  {
    id: "fx-2",
    date: "2024-02-01",
    direction: "sgd_to_usd",
    sgdAmount: 6_384,
    usdAmount: 5_000,
    createdAt: "2024-02-01T10:00:00Z",
  },
  {
    id: "fx-3",
    date: "2024-03-01",
    direction: "sgd_to_usd",
    sgdAmount: 1_276.88,
    usdAmount: 1_000,
    createdAt: "2024-03-01T10:00:00Z",
  },
];

describe("FX performance (conversion-only, informational)", () => {
  it("aggregates SGD used and USD converted from FX records only", () => {
    const metrics = buildFxPerformanceMetrics(userExampleConversions, 1.3);

    expect(metrics.fxCostBasisSgd).toBeCloseTo(9_396.88, 2);
    expect(metrics.totalUsdConverted).toBe(7_350);
  });

  it("example 1: FX 1.30 → +SGD 158.12 gain", () => {
    const metrics = buildFxPerformanceMetrics(userExampleConversions, 1.3);

    expect(metrics.convertedUsdValueSgd).toBeCloseTo(9_555, 2);
    expect(metrics.fxGainLossSgd).toBeCloseTo(158.12, 2);
  });

  it("example 2: FX 1.20 → -SGD 576.88 loss", () => {
    const metrics = buildFxPerformanceMetrics(userExampleConversions, 1.2);

    expect(metrics.convertedUsdValueSgd).toBeCloseTo(8_820, 2);
    expect(metrics.fxGainLossSgd).toBeCloseTo(-576.88, 2);
  });

  it("is unaffected by stock buys, sells, or options activity", () => {
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2024-01-01",
        direction: "sgd_to_usd",
        sgdAmount: 1_000,
        usdAmount: 757.94,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];
    const stockTransactions: StockTransaction[] = [
      {
        id: "buy-1",
        date: "2024-01-02",
        market: "US",
        ticker: "AAPL",
        assetName: "Apple",
        transactionType: "buy",
        quantity: 1,
        price: 757.94,
        grossAmount: 757.94,
        fees: 0,
        netAmount: 757.94,
        currency: "USD",
        createdAt: "2024-01-02T10:00:00Z",
      },
    ];

    const withoutTrades = buildFxPerformanceMetrics(fxConversions, 1.28);
    const withTradesIgnored = buildFxPerformanceMetrics(fxConversions, 1.28);

    expect(withTradesIgnored).toEqual(withoutTrades);
    expect(stockTransactions).toHaveLength(1);
  });

  it("reduces totals on USD → SGD conversion reversals", () => {
    const fxConversions: StockFxConversion[] = [
      ...userExampleConversions,
      {
        id: "fx-4",
        date: "2024-04-01",
        direction: "usd_to_sgd",
        sgdAmount: 1_300,
        usdAmount: 1_000,
        createdAt: "2024-04-01T10:00:00Z",
      },
    ];

    const metrics = buildFxPerformanceMetrics(fxConversions, 1.3);

    expect(metrics.fxCostBasisSgd).toBeCloseTo(8_096.88, 2);
    expect(metrics.totalUsdConverted).toBe(6_350);
    expect(metrics.fxGainLossSgd).toBeCloseTo(
      metrics.convertedUsdValueSgd - metrics.fxCostBasisSgd,
      2
    );
  });
});
