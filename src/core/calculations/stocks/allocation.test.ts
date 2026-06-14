import { describe, expect, it } from "vitest";
import {
  buildStockMarketAllocation,
  deriveStockAllocationReminder,
  deriveStockRebalancingRecommendation,
  STOCK_ALLOCATION_BAND_HIGH_PERCENT,
  STOCK_ALLOCATION_BAND_LOW_PERCENT,
} from "./allocation";

describe("deriveStockAllocationReminder", () => {
  it("flags under target below 73%", () => {
    const result = deriveStockAllocationReminder(70);
    expect(result.status).toBe("under");
    expect(result.message).toContain("under target");
  });

  it("flags over target above 77%", () => {
    const result = deriveStockAllocationReminder(80);
    expect(result.status).toBe("over");
    expect(result.message).toContain("above target");
  });

  it("flags on target within band", () => {
    const result = deriveStockAllocationReminder(75);
    expect(result.status).toBe("on_target");
    expect(result.message).toContain("close to target");
  });

  it(`uses band edges ${STOCK_ALLOCATION_BAND_LOW_PERCENT} and ${STOCK_ALLOCATION_BAND_HIGH_PERCENT}`, () => {
    expect(deriveStockAllocationReminder(73).status).toBe("on_target");
    expect(deriveStockAllocationReminder(77).status).toBe("on_target");
    expect(deriveStockAllocationReminder(72.9).status).toBe("under");
    expect(deriveStockAllocationReminder(77.1).status).toBe("over");
  });
});

describe("buildStockMarketAllocation", () => {
  it("computes US/SG market values and allocation percentages", () => {
    const allocation = buildStockMarketAllocation({
      usMarketValueSgd: 60_000,
      sgMarketValueSgd: 10_000,
      usAvailableTradingCashSgd: 5_000,
      sgAvailableTradingCashSgd: 5_000,
      fxRateValid: true,
      fxRate: 1.35,
    });

    expect(allocation.us.totalMarketValueSgd).toBe(65_000);
    expect(allocation.sg.totalMarketValueSgd).toBe(15_000);
    expect(allocation.totalStockValueSgd).toBe(80_000);
    expect(allocation.usAllocationPercent).toBeCloseTo(81.25, 2);
    expect(allocation.sgAllocationPercent).toBeCloseTo(18.75, 2);
    expect(allocation.us.differencePercent).toBeCloseTo(6.25, 2);
    expect(allocation.sg.differencePercent).toBeCloseTo(-6.25, 2);
    expect(allocation.reminderStatus).toBe("over");
  });

  it("returns zero percents when total stock value is zero", () => {
    const allocation = buildStockMarketAllocation({
      usMarketValueSgd: 0,
      sgMarketValueSgd: 0,
      usAvailableTradingCashSgd: 0,
      sgAvailableTradingCashSgd: 0,
      fxRateValid: true,
      fxRate: 1.35,
    });

    expect(allocation.totalStockValueSgd).toBe(0);
    expect(allocation.usAllocationPercent).toBe(0);
    expect(allocation.sgAllocationPercent).toBe(0);
  });
});

describe("deriveStockRebalancingRecommendation", () => {
  const fxRate = 1.35;

  it("suggests conversion when US is under allocation", () => {
    const result = deriveStockRebalancingRecommendation({
      totalStockValueSgd: 100_000,
      currentUsMarketValueSgd: 50_000,
      sgdCash: 30_000,
      fxRate,
      fxRateValid: true,
    });

    expect(result.targetUsValueSgd).toBe(75_000);
    expect(result.usGapSgd).toBe(25_000);
    expect(result.needsConversion).toBe(true);
    expect(result.suggestedSgdConversion).toBe(25_000);
    expect(result.estimatedUsdReceived).toBeCloseTo(25_000 / fxRate, 2);
    expect(result.message).toContain("consider converting");
    expect(result.message).toContain("S$25,000.00");
    expect(result.message).toContain("US$18,518.52");
  });

  it("shows no conversion when US is over allocation", () => {
    const result = deriveStockRebalancingRecommendation({
      totalStockValueSgd: 100_000,
      currentUsMarketValueSgd: 80_000,
      sgdCash: 10_000,
      fxRate,
      fxRateValid: true,
    });

    expect(result.usGapSgd).toBe(-5_000);
    expect(result.needsConversion).toBe(false);
    expect(result.suggestedSgdConversion).toBe(0);
    expect(result.estimatedUsdReceived).toBe(0);
    expect(result.message).toBe("No USD conversion needed.");
  });

  it("shows no conversion when allocation is within target range", () => {
    const result = deriveStockRebalancingRecommendation({
      totalStockValueSgd: 100_000,
      currentUsMarketValueSgd: 75_000,
      sgdCash: 20_000,
      fxRate,
      fxRateValid: true,
    });

    expect(result.usGapSgd).toBe(0);
    expect(result.needsConversion).toBe(false);
    expect(result.message).toBe("No USD conversion needed.");
  });

  it("caps suggested conversion at zero when no SGD cash is available", () => {
    const result = deriveStockRebalancingRecommendation({
      totalStockValueSgd: 100_000,
      currentUsMarketValueSgd: 50_000,
      sgdCash: 0,
      fxRate,
      fxRateValid: true,
    });

    expect(result.usGapSgd).toBe(25_000);
    expect(result.needsConversion).toBe(true);
    expect(result.suggestedSgdConversion).toBe(0);
    expect(result.estimatedUsdReceived).toBe(0);
    expect(result.message).toContain("S$0.00");
    expect(result.message).toContain("US$0.00");
  });

  it("caps suggested conversion by available SGD cash", () => {
    const result = deriveStockRebalancingRecommendation({
      totalStockValueSgd: 100_000,
      currentUsMarketValueSgd: 50_000,
      sgdCash: 10_000,
      fxRate,
      fxRateValid: true,
    });

    expect(result.usGapSgd).toBe(25_000);
    expect(result.suggestedSgdConversion).toBe(10_000);
    expect(result.estimatedUsdReceived).toBeCloseTo(10_000 / fxRate, 2);
    expect(result.message).toContain("S$10,000.00");
  });
});
