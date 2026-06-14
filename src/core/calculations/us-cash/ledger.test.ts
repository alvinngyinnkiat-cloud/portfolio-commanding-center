import { describe, expect, it } from "vitest";
import type { StockTransaction } from "@/core/domain/types";
import {
  buildUsAvailableCashResult,
  calculateUsAvailableCashUsd,
} from "./ledger";

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

describe("calculateUsAvailableCashUsd", () => {
  it("acceptance: net cash 18k USD, 10k buys → 8k available at FX 1.35", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 24_300,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [
        tx({
          id: "buy-1",
          transactionType: "buy",
          grossAmount: 10_000,
          netAmount: -10_000,
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(8_000);
  });

  it("includes sell proceeds and dividends in available cash", () => {
    const result = buildUsAvailableCashResult({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 6_750,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [
        tx({
          id: "buy-1",
          transactionType: "buy",
          grossAmount: 1_000,
          fees: 5,
          netAmount: -1_005,
        }),
        tx({
          id: "sell-1",
          transactionType: "sell",
          grossAmount: 600,
          fees: 2,
          netAmount: 598,
        }),
        tx({
          id: "div-1",
          transactionType: "dividend",
          grossAmount: 50,
          netAmount: 50,
        }),
      ],
      fxRate: 1.35,
    });

    expect(result.breakdown.usNetStockCashUsd).toBe(5_000);
    expect(result.breakdown.stockBuySpendUsd).toBe(1_005);
    expect(result.breakdown.stockSellProceedsUsd).toBe(598);
    expect(result.breakdown.stockDividendsUsd).toBe(50);
    expect(result.usAvailableCashUsd).toBe(4_643);
  });

  it("subtracts US withdrawals from net stock cash", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
        },
        {
          id: "c2",
          date: "2025-02-01",
          type: "withdrawal",
          category: "stock",
          amountSgd: 2_700,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [],
      fxRate: 1.35,
    });

    expect(available).toBeCloseTo(8_000, 2);
  });

  it("adds realized options P/L when provided", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [],
      fxRate: 1.35,
      realizedOptionsPlUsd: 345,
    });

    expect(available).toBe(10_345);
  });

  it("scopes stock flows to US market only", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [
        tx({
          id: "us-buy",
          market: "US",
          transactionType: "buy",
          grossAmount: 500,
          netAmount: -500,
          currency: "USD",
        }),
        tx({
          id: "sg-buy",
          market: "SG",
          transactionType: "buy",
          grossAmount: 200,
          netAmount: -200,
          currency: "SGD",
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(9_500);
  });

  it("subtracts standalone US fees from available cash", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 6_750,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [
        tx({
          id: "fee-1",
          transactionType: "fee",
          grossAmount: 0,
          fees: 15,
          netAmount: -15,
        }),
      ],
      fxRate: 1.35,
    });

    expect(available).toBe(4_985);
  });

  it("returns 0 USD net cash when FX rate is invalid and deposit has no stored FX", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 13_500,
          usdAllocationPercent: 100,
        },
      ],
      stockTransactions: [],
      fxRate: 0,
    });

    expect(available).toBe(0);
  });

  it("uses deposit-day FX when current FX is invalid", () => {
    const available = calculateUsAvailableCashUsd({
      contributions: [
        {
          id: "c1",
          date: "2025-01-01",
          type: "deposit",
          category: "stock",
          amountSgd: 1_000,
          usdAllocationPercent: 75,
          fxRate: 1.32,
        },
      ],
      stockTransactions: [],
      fxRate: 0,
    });

    expect(available).toBeCloseTo(568.18, 2);
  });
});
