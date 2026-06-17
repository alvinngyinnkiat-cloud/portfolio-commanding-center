import { describe, expect, it } from "vitest";
import type { OptionsTrade } from "@/core/domain/types/options";
import {
  buildOpenOptionCollateralRow,
  buildOpenOptionCollateralRows,
  compareBrokerCashToCollateral,
  computeNetOpenCashContributionUsd,
  summarizeOpenOptionCollateral,
} from "./open-option-collateral-audit";

function creditTrade(overrides: Partial<OptionsTrade> = {}): OptionsTrade {
  return {
    id: "credit-1",
    status: "open",
    tradeType: "personal",
    userSharePercent: 100,
    clientSharePercent: 0,
    strategy: "sellPut",
    underlying: "SPY",
    expirationDate: "2026-12-18",
    contracts: 1,
    openDate: "2025-06-01",
    openPremiumUsd: 100,
    openFeesUsd: 3,
    maxRiskUsd: 500,
    createdAt: "2025-06-01T00:00:00.000Z",
    updatedAt: "2025-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("open-option-collateral-audit", () => {
  it("computes net open cash contribution as premium minus market value minus fees", () => {
    expect(
      computeNetOpenCashContributionUsd({
        premiumReceivedUsd: 100,
        currentMarketValueUsd: -25,
        openingFeesUsd: 3,
      })
    ).toBe(122);
  });

  it("builds collateral rows with strategy, risk, and net contribution", () => {
    const row = buildOpenOptionCollateralRow(
      creditTrade({ currentValueUsd: 25, maxRiskUsd: 500 })
    );

    expect(row).not.toBeNull();
    expect(row!.strategy).toBe("SELL PUT");
    expect(row!.premiumReceivedUsd).toBe(100);
    expect(row!.currentMarketValueUsd).toBe(-25);
    expect(row!.openingFeesUsd).toBe(3);
    expect(row!.netOpenCashContributionUsd).toBe(122);
    expect(row!.maxRiskUsd).toBe(500);
  });

  it("summarizes open risk and estimated reserved capital", () => {
    const rows = buildOpenOptionCollateralRows([
      creditTrade({ id: "a", maxRiskUsd: 500, currentValueUsd: 25 }),
      creditTrade({
        id: "b",
        underlying: "AAPL",
        openPremiumUsd: 200,
        openFeesUsd: 5,
        maxRiskUsd: 1500,
        currentValueUsd: 50,
      }),
    ]);

    const summary = summarizeOpenOptionCollateral(rows);
    expect(summary.openTradesCount).toBe(2);
    expect(summary.totalOpenRiskUsd).toBe(2000);
    expect(summary.estimatedReservedCapitalUsd).toBe(2000);
    expect(summary.premiumReceivedUsd).toBe(300);
    expect(summary.currentMarketValueUsd).toBe(-75);
    expect(summary.netOpenCashContributionUsd).toBe(367);
  });

  it("flags when broker cash difference is explained by open risk", () => {
    const comparison = compareBrokerCashToCollateral({
      expectedUsdCash: 3337.63,
      brokerUsdCash: 1341.21,
      estimatedReservedCapitalUsd: 1996.42,
    });

    expect(comparison.brokerCashDifferenceUsd).toBeCloseTo(1996.42, 2);
    expect(comparison.differenceVsOpenRiskPercent).toBeCloseTo(100, 1);
    expect(comparison.collateralExplainsDifference).toBe(true);
  });
});
