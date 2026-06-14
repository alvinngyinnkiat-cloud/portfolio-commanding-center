import { describe, expect, it } from "vitest";
import type { StockTransaction } from "@/core/domain/types";
import {
  calculateBuyContribution,
  calculateMarketStockContribution,
  summarizeStockContributionFromTransactions,
} from "./contribution";

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

describe("stock contribution from transactions", () => {
  it("sums buy gross amount and associated fees only", () => {
    const transactions: StockTransaction[] = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        grossAmount: 10_000,
        fees: 25,
        netAmount: -10_025,
      }),
      tx({
        id: "div-1",
        transactionType: "dividend",
        grossAmount: 100,
        netAmount: 100,
      }),
      tx({
        id: "sell-1",
        transactionType: "sell",
        grossAmount: 500,
        netAmount: 500,
      }),
    ];

    expect(calculateBuyContribution(transactions[0])).toBe(10_025);
    expect(calculateMarketStockContribution(transactions, "US")).toBe(10_025);
  });

  it("converts US contribution to SGD when FX is valid", () => {
    const transactions: StockTransaction[] = [
      tx({
        id: "buy-1",
        transactionType: "buy",
        grossAmount: 10_000,
        fees: 0,
        netAmount: -10_000,
      }),
      tx({
        id: "sg-buy",
        market: "SG",
        currency: "SGD",
        transactionType: "buy",
        grossAmount: 2_000,
        fees: 10,
        netAmount: -2_010,
      }),
    ];

    const summary = summarizeStockContributionFromTransactions(transactions, 1.35);

    expect(summary.usStockContributionUsd).toBe(10_000);
    expect(summary.usStockContributionSgd).toBe(13_500);
    expect(summary.sgStockContributionSgd).toBe(2_010);
    expect(summary.totalStockContributionSgd).toBe(15_510);
  });
});
