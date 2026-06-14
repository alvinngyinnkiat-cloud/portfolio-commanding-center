import { describe, expect, it } from "vitest";
import {
  calculateVerticalSpreadMetrics,
  validateVerticalSpreadStrikes,
} from "./vertical-spread";
import { validateOpenTradeDraft, resolveOpenTradeDraft } from "./validation";
import { DEFAULT_OPTIONS_SETTINGS } from "@/core/domain/defaults-options";

describe("vertical spread calculations", () => {
  it("bull put: width, max risk, max profit, breakeven", () => {
    const metrics = calculateVerticalSpreadMetrics({
      strategy: "bullPut",
      shortStrikeUsd: 100,
      longStrikeUsd: 95,
      contracts: 2,
      openPremiumUsd: 420,
      openFeesUsd: 2.5,
    });

    expect(metrics.widthPerShare).toBe(5);
    expect(metrics.spreadWidthUsd).toBe(1_000);
    expect(metrics.netCreditUsd).toBe(417.5);
    expect(metrics.maxProfitUsd).toBe(417.5);
    expect(metrics.tpExitPrice75Usd).toBeCloseTo(104.375, 4);
    expect(metrics.maxRiskUsd).toBe(582.5);
    expect(metrics.breakevenUsd).toBeCloseTo(97.9125, 4);
  });

  it("bear call: width, max risk, max profit, breakeven", () => {
    const metrics = calculateVerticalSpreadMetrics({
      strategy: "bearCall",
      shortStrikeUsd: 110,
      longStrikeUsd: 115,
      contracts: 1,
      openPremiumUsd: 250,
      openFeesUsd: 1.5,
    });

    expect(metrics.widthPerShare).toBe(5);
    expect(metrics.spreadWidthUsd).toBe(500);
    expect(metrics.netCreditUsd).toBe(248.5);
    expect(metrics.maxProfitUsd).toBe(248.5);
    expect(metrics.tpExitPrice75Usd).toBeCloseTo(62.125, 3);
    expect(metrics.maxRiskUsd).toBe(251.5);
    expect(metrics.breakevenUsd).toBeCloseTo(112.485, 3);
  });

  it("rejects invalid strike ordering", () => {
    expect(validateVerticalSpreadStrikes("bullPut", 90, 95)).toContain(
      "short strike must be above"
    );
    expect(validateVerticalSpreadStrikes("bearCall", 115, 110)).toContain(
      "long strike must be above"
    );
  });
});

describe("open trade validation — vertical spreads", () => {
  it("derives max risk from strikes for bull put", () => {
    const draft = {
      tradeType: "personal" as const,
      userSharePercent: 100,
      clientSharePercent: 0,
      strategy: "bullPut" as const,
      underlying: "SPY",
      expirationDate: "2025-06-20",
      contracts: 1,
      shortStrikeUsd: 500,
      longStrikeUsd: 495,
      openDate: "2025-06-01",
      openPremiumUsd: 200,
      openFeesUsd: 1,
    };

    const errors = validateOpenTradeDraft(draft, DEFAULT_OPTIONS_SETTINGS);
    expect(errors).toHaveLength(0);

    const resolved = resolveOpenTradeDraft(draft);
    expect(resolved.maxRiskUsd).toBe(301);
  });

  it("requires manual max risk for custom strategy", () => {
    const errors = validateOpenTradeDraft(
      {
        tradeType: "personal",
        userSharePercent: 100,
        clientSharePercent: 0,
        strategy: "custom",
        strategyLabel: "Ratio spread",
        underlying: "AAPL",
        expirationDate: "2025-06-20",
        contracts: 1,
        openDate: "2025-06-01",
        openPremiumUsd: 200,
        openFeesUsd: 1,
      },
      DEFAULT_OPTIONS_SETTINGS
    );
    expect(errors.some((e) => e.field === "maxRiskUsd")).toBe(true);
    expect(errors.some((e) => e.field === "strategyLabel")).toBe(false);
  });
});
