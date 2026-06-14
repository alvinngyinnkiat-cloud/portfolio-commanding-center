import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import {
  buildStockCashFlowSummary,
  calculateStockDepositNetSgd,
  calculateStockFxRate,
} from "./cash-flow";

describe("stock cash flow", () => {
  it("deposit S$1000 increases contribution and SGD cash only", () => {
    const contributions: ContributionTransaction[] = [
      {
        id: "dep-1",
        date: "2024-10-21",
        type: "deposit",
        category: "stock",
        amountSgd: 1_000,
      },
    ];

    const summary = buildStockCashFlowSummary(contributions, [], 1.28);

    expect(calculateStockDepositNetSgd(contributions)).toBe(1_000);
    expect(summary.totalStockContributionSgd).toBe(1_000);
    expect(summary.sgdCashBalanceSgd).toBe(1_000);
    expect(summary.usdCashBalanceUsd).toBe(0);
    expect(summary.usdCashValueSgd).toBe(0);
    expect(summary.totalAvailableStockCashSgd).toBe(1_000);
  });

  it("FX conversion SGD 1000 → USD 757.94 at rate 1.3194", () => {
    const contributions: ContributionTransaction[] = [
      {
        id: "dep-1",
        date: "2024-10-21",
        type: "deposit",
        category: "stock",
        amountSgd: 1_000,
      },
    ];
    const fxConversions: StockFxConversion[] = [
      {
        id: "fx-1",
        date: "2024-10-22",
        direction: "sgd_to_usd",
        sgdAmount: 1_000,
        usdAmount: 757.94,
        createdAt: "2024-10-22T10:00:00Z",
      },
    ];

    expect(calculateStockFxRate(1_000, 757.94)).toBeCloseTo(1.3194, 4);

    const summary = buildStockCashFlowSummary(contributions, fxConversions, 1.28);

    expect(summary.totalStockContributionSgd).toBe(1_000);
    expect(summary.sgdCashBalanceSgd).toBe(0);
    expect(summary.usdCashBalanceUsd).toBeCloseTo(757.94, 2);
    expect(summary.usdCashValueSgd).toBeCloseTo(757.94 * 1.28, 2);
    expect(summary.totalAvailableStockCashSgd).toBeCloseTo(757.94 * 1.28, 2);
  });
});
