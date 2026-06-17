import { describe, expect, it } from "vitest";
import type { PortfolioMetrics } from "@/core/domain/types";
import {
  attributionChartTotal,
  attributionPercentsSumTo100,
  buildGrowthAttribution,
  buildGrowthAttributionChartSlices,
  reconcileAttribution,
} from "./growth-attribution";

function metrics(
  overrides: Partial<PortfolioMetrics> = {}
): PortfolioMetrics {
  return {
    usStocksEtfSgd: 0,
    usStocksEtfUsd: 0,
    sgStocksSgd: 0,
    cryptoSgd: 0,
    cryptoHoldingCount: 0,
    totalCashSgd: 0,
    personalCashSgd: 0,
    clientCashSgd: 0,
    usdTradingCashUsd: 0,
    usdTradingCashSgd: 0,
    sgdTradingCashSgd: 0,
    cryptoCashSgd: 0,
    clientPortfolio: 0,
    clientPortfolioUsd: 0,
    totalPortfolio: 0,
    clientOwnershipPercent: 0,
    usStockContributionSgd: 0,
    sgStockContributionSgd: 0,
    totalStockContributionSgd: 0,
    totalStockValueSgd: 0,
    stockHoldingsValueSgd: 0,
    stockProfitLossSgd: 0,
    stockAvailableTradingCashSgd: 0,
    cryptoContributionSgd: 0,
    totalCryptoValueSgd: 0,
    cryptoHoldingsValueSgd: 0,
    cryptoProfitLossSgd: 0,
    cryptoAvailableTradingCashSgd: 0,
    personalCashContributionSgd: 0,
    optionsValueSgd: 0,
    totalContribution: 16_200,
    totalPortfolioValue: 32_045,
    totalPL: 15_845,
    totalPLPercent: 97.81,
    ownPL: 15_845,
    ownPLPercent: 97.81,
    ownPortfolio: 32_045,
    ...overrides,
  };
}

describe("growth attribution", () => {
  it("computes investment gain as own portfolio minus contribution", () => {
    const attribution = buildGrowthAttribution(metrics());

    expect(attribution.ownPortfolio).toBe(32_045);
    expect(attribution.totalContribution).toBe(16_200);
    expect(attribution.investmentGain).toBe(15_845);
    expect(reconcileAttribution(attribution)).toBe(true);
  });

  it("computes contribution and investment gain percentages", () => {
    const attribution = buildGrowthAttribution(metrics());

    expect(attribution.contributionPercent).toBeCloseTo(50.55, 1);
    expect(attribution.investmentGainPercent).toBeCloseTo(49.45, 1);
    expect(attributionPercentsSumTo100(attribution)).toBe(true);
  });

  it("handles negative investment gain as investment loss", () => {
    const attribution = buildGrowthAttribution(
      metrics({ totalPortfolioValue: 15_000, totalContribution: 16_200 })
    );

    expect(attribution.investmentGain).toBe(-1_200);
    expect(attribution.investmentLabel).toBe("Investment Loss");
    expect(attribution.investmentPercentLabel).toBe("Investment Loss %");
    expect(attribution.contributionPercent).toBeCloseTo(108, 0);
    expect(attribution.investmentGainPercent).toBeCloseTo(-8, 0);
    expect(reconcileAttribution(attribution)).toBe(true);
  });

  it("donut chart slices reconcile with own portfolio when gain is positive", () => {
    const attribution = buildGrowthAttribution(metrics());
    const slices = buildGrowthAttributionChartSlices(attribution);
    const sliceTotal = slices.reduce((sum, slice) => sum + slice.value, 0);

    expect(sliceTotal).toBeCloseTo(attribution.ownPortfolio, 2);
    expect(attributionChartTotal(attribution)).toBe(attribution.ownPortfolio);
  });

  it("donut chart renders loss slice when gain is negative", () => {
    const attribution = buildGrowthAttribution(
      metrics({ totalPortfolioValue: 15_000, totalContribution: 16_200 })
    );
    const slices = buildGrowthAttributionChartSlices(attribution);

    expect(slices).toHaveLength(2);
    expect(slices[1].name).toBe("Investment Loss");
    expect(slices[1].value).toBe(1_200);
    expect(
      slices[0].value + attribution.investmentGain
    ).toBeCloseTo(attribution.ownPortfolio, 2);
  });
});
