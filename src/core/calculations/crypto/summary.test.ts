import { describe, expect, it } from "vitest";
import type { CryptoHolding } from "@/core/domain/types";
import { buildCryptoTrackerSummary } from "./summary";
import type { CryptoTrade } from "@/core/domain/types";

const holdings: CryptoHolding[] = [
  { id: "1", assetName: "BTC", investedSgd: 500, currentValueSgd: 620 },
  { id: "2", assetName: "ETH", investedSgd: 400, currentValueSgd: 380 },
  { id: "3", assetName: "HYPE", investedSgd: 282, currentValueSgd: 650 },
];

describe("buildCryptoTrackerSummary", () => {
  it("calculates totals from holdings and contributed cash", () => {
    const summary = buildCryptoTrackerSummary(holdings, 2000);

    expect(summary.cryptoHoldingsValueSgd).toBe(1650);
    expect(summary.cryptoContributionSgd).toBe(2000);
    expect(summary.availableTradingCashSgd).toBe(818);
    expect(summary.totalValueSgd).toBe(2468);
    expect(summary.cryptoProfitLossSgd).toBe(468);
    expect(summary.cryptoProfitLossPercent).toBeCloseTo(23.4, 1);
    expect(summary.holdingCount).toBe(3);
  });

  it("reduces available cash by deployed buys and fees", () => {
    const withFees: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 500, feesSgd: 10, currentValueSgd: 620 },
    ];
    const summary = buildCryptoTrackerSummary(withFees, 1000);

    expect(summary.cryptoContributionSgd).toBe(1000);
    expect(summary.availableTradingCashSgd).toBe(490);
    expect(summary.cryptoProfitLossSgd).toBe(110);
  });

  it("handles zero holdings", () => {
    const summary = buildCryptoTrackerSummary([], 1000);

    expect(summary.cryptoHoldingsValueSgd).toBe(0);
    expect(summary.cryptoContributionSgd).toBe(1000);
    expect(summary.availableTradingCashSgd).toBe(1000);
    expect(summary.totalValueSgd).toBe(1000);
    expect(summary.cryptoProfitLossSgd).toBe(0);
    expect(summary.cryptoProfitLossPercent).toBe(0);
    expect(summary.holdingCount).toBe(0);
  });

  it("counts deposit-only capital as contribution with zero P/L", () => {
    const summary = buildCryptoTrackerSummary([], 11_575);

    expect(summary.cryptoContributionSgd).toBe(11_575);
    expect(summary.availableTradingCashSgd).toBe(11_575);
    expect(summary.totalValueSgd).toBe(11_575);
    expect(summary.cryptoProfitLossSgd).toBe(0);
  });

  it("uses trade ledger for available cash when trades exist", () => {
    const holdings: CryptoHolding[] = [
      { id: "1", assetName: "BTC", investedSgd: 3000, feesSgd: 20, currentValueSgd: 3500 },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2025-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 3000,
        feesSgd: 20,
      },
    ];
    const summary = buildCryptoTrackerSummary(holdings, 5000, trades);

    expect(summary.cryptoContributionSgd).toBe(5000);
    expect(summary.availableTradingCashSgd).toBe(1980);
  });
});
