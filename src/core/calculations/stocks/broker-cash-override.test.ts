import { describe, expect, it } from "vitest";
import { buildStockPortfolioSummary } from "./summary";

describe("broker USD cash override", () => {
  it("uses override for effective cash while preserving system calculated", () => {
    const portfolio = buildStockPortfolioSummary(
      [],
      [],
      [],
      1.35,
      [],
      [],
      1341.21
    );

    expect(portfolio.systemCalculatedUsCashUsd).toBe(0);
    expect(portfolio.usAvailableTradingCashUsd).toBe(1341.21);
    expect(portfolio.usesBrokerUsdCashOverride).toBe(true);
    expect(portfolio.totalUsNetValueUsd).toBe(1341.21);
  });

  it("falls back to system calculated when override is blank", () => {
    const portfolio = buildStockPortfolioSummary([], [], [], 1.35, [], [], null);
    expect(portfolio.usAvailableTradingCashUsd).toBe(0);
    expect(portfolio.systemCalculatedUsCashUsd).toBe(0);
    expect(portfolio.usesBrokerUsdCashOverride).toBe(false);
  });
});
