import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import { buildStockPortfolioSummary, buildStockTrackerSummary } from "./summary";

describe("stock FX cash valuation", () => {
  it("deposit S$1000 at 75/25, deposit FX 1.32, current FX 1.28", () => {
    const contributions: ContributionTransaction[] = [
      {
        id: "dep-1",
        date: "2026-01-15",
        type: "deposit",
        category: "stock",
        amountSgd: 1_000,
        usdAllocationPercent: 75,
        fxRate: 1.32,
      },
    ];

    const tracker = buildStockTrackerSummary(
      [],
      contributions,
      [],
      1.28
    );
    const portfolio = buildStockPortfolioSummary(
      [],
      contributions,
      [],
      1.28
    );

    expect(tracker.usAvailableTradingCashUsd).toBeCloseTo(568.18, 2);
    expect(tracker.usAvailableTradingCashSgd).toBeCloseTo(727.27, 2);
    expect(tracker.sgAvailableTradingCashSgd).toBe(250);
    expect(tracker.availableTradingCashSgd).toBeCloseTo(977.27, 2);
    expect(tracker.stockContributionSgd).toBe(1_000);
    expect(tracker.totalStockValueSgd).toBeCloseTo(977.27, 2);
    expect(tracker.stockProfitLossSgd).toBeCloseTo(-22.73, 2);

    expect(portfolio.allMarketTotalValueSgd).toBeCloseTo(977.27, 2);
    expect(portfolio.allMarketPLSgd).toBeCloseTo(-22.73, 2);
  });
});
