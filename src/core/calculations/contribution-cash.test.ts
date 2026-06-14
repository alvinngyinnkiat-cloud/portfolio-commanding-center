import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  calculateCashBalancesFromContributions,
  calculateContributionTotalSgd,
  getContributionCashDisplay,
} from "./contribution-cash";

function stockDeposit(
  overrides: Partial<ContributionTransaction> & Pick<ContributionTransaction, "date">
): ContributionTransaction {
  return {
    id: overrides.id ?? "tx-1",
    type: "deposit",
    category: "stock",
    amountSgd: 1_000,
    ...overrides,
  };
}

describe("contribution cash impact", () => {
  it("stock deposit adds full amount to SGD trading cash only", () => {
    const jan = stockDeposit({ id: "jan", date: "2026-01-15" });
    const display = getContributionCashDisplay(jan, 1.35);

    expect(display.usdCashAddedUsd).toBe(0);
    expect(display.sgdCashAddedSgd).toBe(1_000);
    expect(calculateContributionTotalSgd([jan])).toBe(1_000);

    const balances = calculateCashBalancesFromContributions([jan], 1.35);
    expect(balances.usdTradingCashUsd).toBe(0);
    expect(balances.sgdTradingCashSgd).toBe(1_000);
  });

  it("stock withdrawal subtracts SGD trading cash only", () => {
    const withdrawal: ContributionTransaction = {
      id: "w1",
      date: "2026-03-01",
      type: "withdrawal",
      category: "stock",
      amountSgd: 1_000,
    };
    const display = getContributionCashDisplay(withdrawal, 1.35);

    expect(display.usdCashAddedUsd).toBe(0);
    expect(display.sgdCashAddedSgd).toBe(-1_000);
  });

  it("FX conversions supply USD trading cash in balances", () => {
    const contributions = [
      stockDeposit({ id: "jan", date: "2026-01-15" }),
      stockDeposit({ id: "feb", date: "2026-02-15" }),
    ];
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2026-02-16",
        direction: "sgd_to_usd",
        sgdAmount: 1_500,
        usdAmount: 1_111.11,
        createdAt: "2026-02-16T00:00:00.000Z",
      },
    ];

    expect(calculateContributionTotalSgd(contributions)).toBe(2_000);

    const balances = calculateCashBalancesFromContributions(
      contributions,
      1.35,
      fxConversions
    );
    expect(balances.usdTradingCashUsd).toBeCloseTo(1_111.11, 2);
    expect(balances.sgdTradingCashSgd).toBe(500);
  });

  it("crypto deposit adds SGD to crypto cash only", () => {
    const crypto: ContributionTransaction = {
      id: "c1",
      date: "2026-01-01",
      type: "deposit",
      category: "crypto",
      amountSgd: 500,
    };
    const display = getContributionCashDisplay(crypto, 1.35);
    const balances = calculateCashBalancesFromContributions([crypto], 1.35);

    expect(display.cryptoCashAddedSgd).toBe(500);
    expect(display.fxRate).toBeNull();
    expect(balances.cryptoCashSgd).toBe(500);
    expect(balances.usdTradingCashUsd).toBe(0);
  });
});
