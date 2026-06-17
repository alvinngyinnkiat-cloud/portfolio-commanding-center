import { describe, expect, it } from "vitest";
import type { StockTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  buildFxPerformanceMetrics,
  calculateRemainingFxCostBasisSgd,
} from "./fx-performance";

describe("FX performance (informational)", () => {
  it("FX cost basis equals SGD sent when all converted USD remains as cash", () => {
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2024-01-01",
        direction: "sgd_to_usd",
        sgdAmount: 1_000,
        usdAmount: 757.94,
        createdAt: "2024-01-01T10:00:00Z",
      },
      {
        id: "fx-2",
        date: "2024-02-01",
        direction: "sgd_to_usd",
        sgdAmount: 2_000,
        usdAmount: 1_500,
        createdAt: "2024-02-01T10:00:00Z",
      },
      {
        id: "fx-3",
        date: "2024-03-01",
        direction: "sgd_to_usd",
        sgdAmount: 500,
        usdAmount: 380,
        createdAt: "2024-03-01T10:00:00Z",
      },
    ];

    const metrics = buildFxPerformanceMetrics({
      contributions: [],
      fxConversions,
      stockTransactions: [],
      fxRate: 1.286,
    });

    expect(metrics.fxCostBasisSgd).toBe(3_500);
    expect(metrics.currentUsdCashUsd).toBeCloseTo(2_637.94, 2);
    expect(metrics.currentUsdValueSgd).toBeCloseTo(2_637.94 * 1.286, 2);
    expect(metrics.fxGainLossSgd).toBeCloseTo(
      metrics.currentUsdValueSgd - 3_500,
      2
    );
  });

  it("matches user example: SGD 25,000 converted, USD 19,781.79 at FX 1.286", () => {
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2024-01-01",
        direction: "sgd_to_usd",
        sgdAmount: 25_000,
        usdAmount: 19_781.79,
        createdAt: "2024-01-01T10:00:00Z",
      },
    ];

    const metrics = buildFxPerformanceMetrics({
      contributions: [],
      fxConversions,
      stockTransactions: [],
      fxRate: 1.286,
    });

    expect(metrics.fxCostBasisSgd).toBe(25_000);
    expect(metrics.currentUsdValueSgd).toBeCloseTo(25_439.38, 2);
    expect(metrics.fxGainLossSgd).toBeCloseTo(439.38, 2);
  });

  it("reduces FX cost basis proportionally when USD is spent on US stock buys", () => {
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
        price: 500,
        grossAmount: 500,
        fees: 0,
        netAmount: 500,
        currency: "USD",
        createdAt: "2024-01-02T10:00:00Z",
      },
    ];

    const remainingBasis = calculateRemainingFxCostBasisSgd(
      fxConversions,
      stockTransactions
    );

    expect(remainingBasis).toBeCloseTo(1_000 * (1 - 500 / 757.94), 2);
  });

  it("does not change FX cost basis when USD inflows come from stock sells", () => {
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
      {
        id: "sell-1",
        date: "2024-01-03",
        market: "US",
        ticker: "AAPL",
        assetName: "Apple",
        transactionType: "sell",
        quantity: 1,
        price: 800,
        grossAmount: 800,
        fees: 0,
        netAmount: 800,
        currency: "USD",
        createdAt: "2024-01-03T10:00:00Z",
      },
    ];

    const remainingBasis = calculateRemainingFxCostBasisSgd(
      fxConversions,
      stockTransactions
    );

    expect(remainingBasis).toBe(0);
  });
});
