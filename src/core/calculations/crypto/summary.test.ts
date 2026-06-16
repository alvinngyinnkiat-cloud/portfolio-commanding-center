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

  it("reduces crypto cash by buy totals and associated fees", () => {
    const withFees: CryptoHolding[] = [
      {
        id: "1",
        assetName: "BTC",
        investedSgd: 500,
        feesSgd: 10,
        currentValueSgd: 620,
      },
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

  it("uses trade ledger for crypto cash when trades exist", () => {
    const holdings: CryptoHolding[] = [
      {
        id: "1",
        assetName: "BTC",
        investedSgd: 3000,
        feesSgd: 20,
        currentValueSgd: 3500,
      },
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

  it("reports total fees separately from portfolio math", () => {
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2026-06-15",
        assetName: "BTC",
        type: "buy",
        amountSgd: 3000,
        feesSgd: 20,
      },
    ];
    const summary = buildCryptoTrackerSummary(holdings, 5000, trades);

    expect(summary.totalFeesPaidSgd).toBe(20);
    expect(summary.availableTradingCashSgd).toBe(1980);
  });

  it("validation example: negative crypto cash when buys and fees exceed contribution", () => {
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2026-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 11_491.98,
        feesSgd: 83.02,
      },
    ];
    const summary = buildCryptoTrackerSummary([], 11_500, trades);

    expect(summary.cryptoContributionSgd).toBe(11_500);
    expect(summary.availableTradingCashSgd).toBeCloseTo(-75, 2);
    expect(summary.totalFeesPaidSgd).toBeCloseTo(83.02, 2);
  });

  it("validation example: net value and P/L from holdings plus crypto cash", () => {
    const exampleHoldings: CryptoHolding[] = [
      {
        id: "1",
        assetName: "BTC",
        investedSgd: 4000,
        currentValueSgd: 8248.6,
      },
    ];
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2026-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 11_075,
        feesSgd: 0,
      },
    ];
    const summary = buildCryptoTrackerSummary(exampleHoldings, 11_575, trades);

    expect(summary.cryptoContributionSgd).toBe(11_575);
    expect(summary.cryptoHoldingsValueSgd).toBeCloseTo(8248.6, 2);
    expect(summary.availableTradingCashSgd).toBe(500);
    expect(summary.totalValueSgd).toBeCloseTo(8748.6, 2);
    expect(summary.cryptoProfitLossSgd).toBeCloseTo(-2826.4, 2);
  });

  it("standardised summary card formula checklist", () => {
    const trades: CryptoTrade[] = [
      {
        id: "t1",
        date: "2026-01-01",
        assetName: "BTC",
        type: "buy",
        amountSgd: 8000,
        feesSgd: 51.4,
      },
      {
        id: "t2",
        date: "2026-02-01",
        assetName: "ETH",
        type: "buy",
        amountSgd: 2000,
        feesSgd: 31.6,
      },
    ];
    const exampleHoldings: CryptoHolding[] = [
      {
        id: "1",
        assetName: "BTC",
        investedSgd: 8000,
        feesSgd: 51.4,
        currentValueSgd: 7500,
      },
      {
        id: "2",
        assetName: "ETH",
        investedSgd: 2000,
        feesSgd: 31.6,
        currentValueSgd: 2100,
      },
    ];
    const contribution = 12_000 - 500;
    const summary = buildCryptoTrackerSummary(
      exampleHoldings,
      contribution,
      trades
    );

    const buyTotal = 8000 + 2000;
    const feesTotal = 51.4 + 31.6;

    expect(summary.totalValueSgd).toBeCloseTo(
      summary.cryptoHoldingsValueSgd + summary.availableTradingCashSgd,
      2
    );
    expect(summary.cryptoProfitLossSgd).toBeCloseTo(
      summary.totalValueSgd - summary.cryptoContributionSgd,
      2
    );
    expect(summary.cryptoContributionSgd).toBe(contribution);
    expect(summary.availableTradingCashSgd).toBeCloseTo(
      contribution - buyTotal - feesTotal,
      2
    );
    expect(summary.totalFeesPaidSgd).toBeCloseTo(feesTotal, 2);
  });
});
