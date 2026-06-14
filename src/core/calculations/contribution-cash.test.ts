import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import {
  calculateCashBalancesFromContributions,
  calculateContributionTotalSgd,
  getContributionCashDisplay,
  resolveContributionFxRate,
} from "./contribution-cash";

function stockDeposit(
  overrides: Partial<ContributionTransaction> & Pick<ContributionTransaction, "date">
): ContributionTransaction {
  return {
    id: overrides.id ?? "tx-1",
    type: "deposit",
    category: "stock",
    amountSgd: 1_000,
    usdAllocationPercent: 75,
    ...overrides,
  };
}

describe("contribution per-transaction FX", () => {
  it("Jan: S$1,000 at 75/25 and FX 1.30", () => {
    const jan = stockDeposit({
      id: "jan",
      date: "2026-01-15",
      fxRate: 1.3,
    });
    const display = getContributionCashDisplay(jan, 1.35);

    expect(display.usdCashAddedUsd).toBeCloseTo(576.92, 2);
    expect(display.sgdCashAddedSgd).toBe(250);
    expect(calculateContributionTotalSgd([jan])).toBe(1_000);

    const balances = calculateCashBalancesFromContributions([jan], 1.35);
    expect(balances.usdTradingCashUsd).toBeCloseTo(576.92, 2);
    expect(balances.sgdTradingCashSgd).toBe(250);
  });

  it("Feb: S$1,000 at 75/25 and FX 1.20", () => {
    const feb = stockDeposit({
      id: "feb",
      date: "2026-02-15",
      fxRate: 1.2,
    });
    const display = getContributionCashDisplay(feb, 1.35);

    expect(display.usdCashAddedUsd).toBeCloseTo(625, 2);
    expect(display.sgdCashAddedSgd).toBe(250);
  });

  it("acceptance: Jan + Feb cumulative totals", () => {
    const contributions = [
      stockDeposit({ id: "jan", date: "2026-01-15", fxRate: 1.3 }),
      stockDeposit({ id: "feb", date: "2026-02-15", fxRate: 1.2 }),
    ];

    expect(calculateContributionTotalSgd(contributions)).toBe(2_000);

    const balances = calculateCashBalancesFromContributions(contributions, 1.35);
    expect(balances.usdTradingCashUsd).toBeCloseTo(1_201.92, 2);
    expect(balances.sgdTradingCashSgd).toBe(500);
  });

  it("withdrawal uses the transaction fxRate for USD leg", () => {
    const withdrawal: ContributionTransaction = {
      id: "w1",
      date: "2026-03-01",
      type: "withdrawal",
      category: "stock",
      amountSgd: 1_000,
      usdAllocationPercent: 75,
      fxRate: 1.2,
    };
    const display = getContributionCashDisplay(withdrawal, 1.35);

    expect(display.usdCashAddedUsd).toBeCloseTo(-625, 2);
    expect(display.sgdCashAddedSgd).toBe(-250);
  });

  it("falls back to global FX when transaction fxRate is missing", () => {
    const legacy = stockDeposit({ id: "legacy", date: "2025-01-01" });
    expect(resolveContributionFxRate(legacy, 1.35)).toBe(1.35);

    const display = getContributionCashDisplay(legacy, 1.35);
    expect(display.usdCashAddedUsd).toBeCloseTo(555.56, 2);
    expect(display.sgdCashAddedSgd).toBe(250);
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
