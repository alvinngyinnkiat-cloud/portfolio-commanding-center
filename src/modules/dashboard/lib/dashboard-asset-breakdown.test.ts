import { describe, expect, it } from "vitest";

import {
  buildDashboardAssetBreakdown,
  DASHBOARD_ASSET_BREAKDOWN_LABELS,
} from "./dashboard-asset-breakdown";

describe("buildDashboardAssetBreakdown", () => {
  it("uses the same four values for cards, chart, legend, and percentages", () => {
    const breakdown = buildDashboardAssetBreakdown(18_218.66, {
      sgStocksSgd: 7_196,
      cryptoHoldingsValueSgd: 7_945.55,
      totalCashSgd: 7_090.7,
    });

    expect(breakdown.usStockHoldingsValueSgd).toBe(18_218.66);
    expect(breakdown.sgHoldingsValueSgd).toBe(7_196);
    expect(breakdown.cryptoHoldingsValueSgd).toBe(7_945.55);
    expect(breakdown.totalCashSgd).toBe(7_090.7);

    expect(breakdown.items).toHaveLength(4);
    expect(breakdown.items.map((item) => item.name)).toEqual([
      DASHBOARD_ASSET_BREAKDOWN_LABELS.usStockHoldings,
      DASHBOARD_ASSET_BREAKDOWN_LABELS.sgHoldings,
      DASHBOARD_ASSET_BREAKDOWN_LABELS.cryptoHoldings,
      DASHBOARD_ASSET_BREAKDOWN_LABELS.totalCash,
    ]);
    expect(breakdown.items.map((item) => item.value)).toEqual([
      18_218.66,
      7_196,
      7_945.55,
      7_090.7,
    ]);

    expect(breakdown.total).toBeCloseTo(40_450.91, 2);

    const pctSum = breakdown.items.reduce(
      (sum, item) => sum + (item.value / breakdown.total) * 100,
      0
    );
    expect(pctSum).toBeCloseTo(100, 5);
  });

  it("does not use legacy US Holding Value label", () => {
    const breakdown = buildDashboardAssetBreakdown(100, {
      sgStocksSgd: 50,
      cryptoHoldingsValueSgd: 25,
      totalCashSgd: 25,
    });

    expect(
      breakdown.items.some((item) => item.name === "US Holding Value (SGD)")
    ).toBe(false);
    expect(breakdown.items[0].name).toBe(
      DASHBOARD_ASSET_BREAKDOWN_LABELS.usStockHoldings
    );
  });
});
