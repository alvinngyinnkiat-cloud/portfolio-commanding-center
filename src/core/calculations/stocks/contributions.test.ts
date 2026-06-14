import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  calculateNetStockCashContributedSgd,
  calculateSgNetStockCashContributedSgd,
  calculateUsNetStockCashContributedSgd,
  summarizeNetStockCashBreakdown,
} from "./contributions";

function stockTx(
  overrides: Partial<ContributionTransaction> & Pick<ContributionTransaction, "type" | "amountSgd">
): ContributionTransaction {
  return {
    id: "tx-1",
    date: "2025-01-01",
    category: "stock",
    ...overrides,
  };
}

describe("Module 2 net stock cash", () => {
  it("deposits add to SGD pool; US SGD leg is zero", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({ id: "c1", type: "deposit", amountSgd: 10_800 }),
      stockTx({ id: "c2", type: "deposit", amountSgd: 4_000 }),
    ];

    expect(calculateUsNetStockCashContributedSgd(contributions)).toBe(0);
    expect(calculateSgNetStockCashContributedSgd(contributions)).toBe(14_800);
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(14_800);
  });

  it("FX conversions adjust SGD pool without changing contribution total", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({ id: "c1", type: "deposit", amountSgd: 10_000 }),
    ];
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2025-01-02",
        direction: "sgd_to_usd",
        sgdAmount: 7_500,
        usdAmount: 5_769.23,
        createdAt: "2025-01-02T00:00:00.000Z",
      },
    ];

    expect(calculateSgNetStockCashContributedSgd(contributions, fxConversions)).toBe(
      2_500
    );
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(10_000);
  });

  it("stock withdrawals reduce deposit net and SGD pool", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({ id: "c1", type: "deposit", amountSgd: 10_000 }),
      stockTx({ id: "c2", type: "withdrawal", amountSgd: 2_000 }),
    ];

    expect(calculateUsNetStockCashContributedSgd(contributions)).toBe(0);
    expect(calculateSgNetStockCashContributedSgd(contributions)).toBe(8_000);
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(8_000);
  });

  it("excludes crypto deposits and non-stock activity", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({ id: "c1", type: "deposit", amountSgd: 5_000 }),
      {
        id: "c2",
        date: "2025-01-02",
        type: "deposit",
        category: "crypto",
        amountSgd: 3_000,
      },
    ];

    const summary = summarizeNetStockCashBreakdown(contributions);

    expect(summary.usNetStockCashContributedSgd).toBe(0);
    expect(summary.sgNetStockCashContributedSgd).toBe(5_000);
    expect(summary.netStockCashContributedSgd).toBe(5_000);
  });
});
