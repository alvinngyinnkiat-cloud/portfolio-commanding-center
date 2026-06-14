import { describe, expect, it } from "vitest";
import type { CryptoHolding } from "@/core/domain/types";
import { buildCryptoTrackerSummary } from "./summary";

const holdings: CryptoHolding[] = [
  { id: "1", assetName: "BTC", investedSgd: 500, currentValueSgd: 620 },
  { id: "2", assetName: "ETH", investedSgd: 400, currentValueSgd: 380 },
  { id: "3", assetName: "HYPE", investedSgd: 282, currentValueSgd: 650 },
];

describe("buildCryptoTrackerSummary", () => {
  it("calculates totals from holdings and contributed cash", () => {
    const summary = buildCryptoTrackerSummary(holdings, 2000);

    expect(summary.cryptoHoldingsValueSgd).toBe(1650);
    expect(summary.cryptoContributionSgd).toBe(1182);
    expect(summary.availableTradingCashSgd).toBe(818);
    expect(summary.totalValueSgd).toBe(2468);
    expect(summary.cryptoProfitLossSgd).toBe(468);
    expect(summary.cryptoProfitLossPercent).toBeCloseTo(39.59, 1);
    expect(summary.holdingCount).toBe(3);
  });

  it("includes buy fees in crypto contribution", () => {
    const withFees: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, feesSgd: 10, currentValueSgd: 620 },
    ];
    const summary = buildCryptoTrackerSummary(withFees, 1000);

    expect(summary.cryptoContributionSgd).toBe(510);
    expect(summary.availableTradingCashSgd).toBe(490);
    expect(summary.cryptoProfitLossSgd).toBe(110);
  });

  it("handles zero holdings", () => {
    const summary = buildCryptoTrackerSummary([], 1000);

    expect(summary.cryptoHoldingsValueSgd).toBe(0);
    expect(summary.availableTradingCashSgd).toBe(1000);
    expect(summary.totalValueSgd).toBe(1000);
    expect(summary.cryptoProfitLossPercent).toBe(0);
    expect(summary.holdingCount).toBe(0);
  });
});
