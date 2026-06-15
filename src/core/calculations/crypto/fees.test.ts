import { describe, expect, it } from "vitest";
import {
  calculateCryptoFeesForMonth,
  calculateCryptoFeesForYear,
  calculateTotalCryptoFeesPaid,
} from "./fees";
import type { CryptoTrade } from "@/core/domain/types";

const trades: CryptoTrade[] = [
  {
    id: "1",
    date: "2026-06-10",
    assetName: "BTC",
    type: "buy",
    amountSgd: 1000,
    feesSgd: 5,
  },
  {
    id: "2",
    date: "2026-06-20",
    assetName: "ETH",
    type: "sell",
    amountSgd: 400,
    feesSgd: 2,
  },
  {
    id: "3",
    date: "2025-12-01",
    assetName: "BTC",
    type: "buy",
    amountSgd: 500,
    feesSgd: 1,
  },
];

describe("crypto fee reporting", () => {
  it("sums all buy and sell fees", () => {
    expect(calculateTotalCryptoFeesPaid(trades)).toBe(8);
  });

  it("sums fees for the current calendar month", () => {
    expect(
      calculateCryptoFeesForMonth(trades, new Date(2026, 5, 15))
    ).toBe(7);
  });

  it("sums fees for the current calendar year", () => {
    expect(calculateCryptoFeesForYear(trades, new Date(2026, 5, 15))).toBe(7);
    expect(calculateCryptoFeesForYear(trades, new Date(2025, 0, 1))).toBe(1);
  });
});
