import { describe, expect, it } from "vitest";
import {
  normalizeStockTransaction,
  normalizeStockTransactions,
} from "./transaction-normalize";
import { buildPositionLedgers, calculateAllPositionHoldings } from "./holdings";

describe("normalizeStockTransactions", () => {
  it("normalizes legacy market and transaction type casing", () => {
    const row = normalizeStockTransaction({
      id: "tx-1",
      date: "2025-01-15",
      market: "us",
      ticker: "nvda",
      assetName: "NVIDIA",
      transactionType: "Buy",
      quantity: 82,
      price: 100,
      grossAmount: 8200,
      fees: 5,
      netAmount: -8205,
      currency: "USD",
      createdAt: "2025-01-15T00:00:00.000Z",
    });

    expect(row).toMatchObject({
      market: "US",
      ticker: "NVDA",
      transactionType: "buy",
      currency: "USD",
      quantity: 82,
    });
  });

  it("rebuilds holdings from normalized legacy rows", () => {
    const transactions = normalizeStockTransactions([
      {
        id: "buy-1",
        date: "2025-01-01",
        market: "US",
        ticker: "NVDA",
        assetName: "NVIDIA",
        transactionType: "BUY",
        quantity: 10,
        price: 100,
        grossAmount: 1000,
        fees: 0,
        netAmount: -1000,
        currency: "USD",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
      {
        id: "sell-1",
        date: "2025-06-01",
        market: "US",
        ticker: "NVDA",
        assetName: "NVIDIA",
        transactionType: "SELL",
        quantity: 4,
        price: 120,
        grossAmount: 480,
        fees: 0,
        netAmount: 480,
        currency: "USD",
        createdAt: "2025-06-01T00:00:00.000Z",
      },
    ]);

    const ledgers = buildPositionLedgers(transactions);
    const nvda = ledgers.get("US:NVDA");
    expect(nvda?.quantity).toBe(6);

    const positions = calculateAllPositionHoldings(transactions, [], 1.35);
    expect(positions).toHaveLength(1);
    expect(positions[0]?.quantity).toBe(6);
  });

  it("drops rows missing required fields", () => {
    const rows = normalizeStockTransactions([
      { id: "bad-1", transactionType: "buy" },
      {
        id: "good-1",
        date: "2025-01-01",
        market: "SG",
        ticker: "D05",
        transactionType: "buy",
        quantity: 100,
        price: 35,
        grossAmount: 3500,
        fees: 0,
        netAmount: -3500,
        currency: "SGD",
        createdAt: "2025-01-01T00:00:00.000Z",
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.market).toBe("SG");
  });
});
