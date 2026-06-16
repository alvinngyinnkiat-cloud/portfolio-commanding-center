import { describe, expect, it } from "vitest";
import { normalizeStockTransaction } from "./transaction-normalize";
import { calculateSgAvailableCashSgd } from "./trading-cash";

describe("transaction amount resolution for cash", () => {
  it("normalizes legacy SG buy rows with quantity × price but zero grossAmount", () => {
    const row = normalizeStockTransaction({
      id: "sti-buy",
      date: "2026-06-14",
      market: "SG",
      ticker: "STI",
      transactionType: "buy",
      quantity: 100,
      price: 1,
      grossAmount: 0,
      fees: 0,
      netAmount: 0,
      currency: "SGD",
      createdAt: "2026-06-14T00:00:00.000Z",
    });

    expect(row?.grossAmount).toBe(100);
    expect(row?.netAmount).toBe(-100);

    const cash = calculateSgAvailableCashSgd(12_283.25, [row!]);
    expect(cash).toBeCloseTo(12_183.25, 2);
  });
});
