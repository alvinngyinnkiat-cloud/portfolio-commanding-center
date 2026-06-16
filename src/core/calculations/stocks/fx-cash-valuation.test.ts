import { describe, expect, it } from "vitest";
import type { ContributionTransaction } from "@/core/domain/types";
import type { StockFxConversion } from "@/core/domain/types/stock-fx-conversion";
import { buildStockPortfolioSummary, buildStockTrackerSummary } from "./summary";

describe("stock FX cash valuation", () => {
  it("deposit S$1000 then FX conversion; current FX 1.28 values USD pool", () => {
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

    const tracker = buildStockTrackerSummary(
      [],
      contributions,
      [],
      1.28,
      [],
      fxConversions
    );
    const portfolio = buildStockPortfolioSummary(
      [],
      contributions,
      [],
      1.28,
      [],
      fxConversions
    );

    expect(tracker.usAvailableTradingCashUsd).toBeCloseTo(757.94, 2);
    expect(tracker.usAvailableTradingCashSgd).toBeCloseTo(757.94 * 1.28, 2);
    expect(tracker.sgAvailableTradingCashSgd).toBe(0);
    expect(tracker.stockContributionSgd).toBe(1_000);
    expect(tracker.availableTradingCashSgd).toBeCloseTo(757.94 * 1.28, 2);

    expect(portfolio.allMarketTotalValueSgd).toBeCloseTo(757.94 * 1.28, 2);
  });
});
