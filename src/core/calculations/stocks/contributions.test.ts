import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
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
  it("acceptance: US/SG allocation from stock deposits only", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({
        id: "c1",
        type: "deposit",
        amountSgd: 10_800,
        usdAllocationPercent: 100,
      }),
      stockTx({
        id: "c2",
        type: "deposit",
        amountSgd: 4_000,
        usdAllocationPercent: 0,
      }),
    ];

    expect(calculateUsNetStockCashContributedSgd(contributions)).toBe(10_800);
    expect(calculateSgNetStockCashContributedSgd(contributions)).toBe(4_000);
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(14_800);
  });

  it("acceptance: 75/25 split allocates SGD legs without FX conversion", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({
        id: "c1",
        type: "deposit",
        amountSgd: 10_000,
        usdAllocationPercent: 75,
      }),
    ];

    expect(calculateUsNetStockCashContributedSgd(contributions)).toBe(7_500);
    expect(calculateSgNetStockCashContributedSgd(contributions)).toBe(2_500);
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(10_000);
  });

  it("acceptance: stock withdrawals reduce allocated legs", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({
        id: "c1",
        type: "deposit",
        amountSgd: 10_000,
        usdAllocationPercent: 100,
      }),
      stockTx({
        id: "c2",
        type: "withdrawal",
        amountSgd: 2_000,
        usdAllocationPercent: 50,
      }),
    ];

    expect(calculateUsNetStockCashContributedSgd(contributions)).toBe(9_000);
    expect(calculateSgNetStockCashContributedSgd(contributions)).toBe(-1_000);
    expect(calculateNetStockCashContributedSgd(contributions)).toBe(8_000);
  });

  it("excludes crypto deposits and non-stock activity", () => {
    const contributions: ContributionTransaction[] = [
      stockTx({
        id: "c1",
        type: "deposit",
        amountSgd: 5_000,
        usdAllocationPercent: 100,
      }),
      {
        id: "c2",
        date: "2025-01-02",
        type: "deposit",
        category: "crypto",
        amountSgd: 3_000,
      },
    ];

    const summary = summarizeNetStockCashBreakdown(contributions);

    expect(summary.usNetStockCashContributedSgd).toBe(5_000);
    expect(summary.sgNetStockCashContributedSgd).toBe(0);
    expect(summary.netStockCashContributedSgd).toBe(5_000);
  });
});
